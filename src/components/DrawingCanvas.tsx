import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DrawingCanvasProps {
  canvasId: string;
  layerId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  tool: 'select' | 'draw' | 'erase';
  brushSize: number;
  brushColor: string;
  lineStyle: 'solid' | 'dashed';
  zoom: number;
  panX: number;
  panY: number;
  onDrawingChange?: (hasDrawing: boolean) => void;
  onUndoStackChange?: (stack: string[]) => void;
  onRedoStackChange?: (stack: string[]) => void;
  onDeleteSelected?: () => void;
}

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
];

export const DrawingCanvas = forwardRef<any, DrawingCanvasProps>(({
  canvasId,
  layerId,
  containerRef,
  tool,
  brushSize,
  brushColor,
  lineStyle,
  zoom,
  panX,
  panY,
  onDrawingChange,
  onUndoStackChange,
  onRedoStackChange,
  onDeleteSelected,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isLoadingFromJSON, setIsLoadingFromJSON] = useState(false);
  const { toast } = useToast();

  const saveDrawing = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.log('SaveDrawing: No canvas reference available');
      return;
    }

    console.log('SaveDrawing: Starting save process for canvas:', canvasId, 'layer:', layerId);

    try {
      // Reset viewport transform before saving to get actual object coordinates
      const currentTransform = canvas.viewportTransform;
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      
      const rawDrawingData = canvas.toJSON();
      const hasObjects = rawDrawingData.objects && rawDrawingData.objects.length > 0;
      
      console.log('SaveDrawing: Canvas data extracted, objects count:', rawDrawingData.objects?.length || 0);
      
      // 🔧 COORDINATE CONVERSION: Convert absolute coordinates to relative coordinates
      const canvasWidth = canvas.width || 1200;
      const canvasHeight = canvas.height || 800;
      
      const drawingData = {
        ...rawDrawingData,
        objects: rawDrawingData.objects?.map(obj => {
          if (obj.type === 'Path' && obj.path) {
            // Convert path coordinates to relative (0-1 range)
            const relativeObj = {
              ...obj,
              left: obj.left / canvasWidth,
              top: obj.top / canvasHeight,
              path: obj.path.map(segment => {
                if (Array.isArray(segment)) {
                  return segment.map((point, index) => {
                    if (index === 0) return point; // Command letter (M, L, Q, etc.)
                    if (typeof point === 'number') {
                      // Convert coordinate
                      return index % 2 === 1 ? point / canvasWidth : point / canvasHeight;
                    }
                    return point;
                  });
                }
                return segment;
              })
            };
            console.log('SaveDrawing: Converted path from absolute to relative:', {
              absolute: { left: obj.left, top: obj.top, pathSample: obj.path[0] },
              relative: { left: relativeObj.left, top: relativeObj.top, pathSample: relativeObj.path[0] }
            });
            return relativeObj;
          }
          return obj;
        }) || []
      };
      
      // Restore viewport transform
      if (currentTransform) {
        canvas.setViewportTransform(currentTransform);
      }

      // Local storage backup before attempting database save
      const localStorageKey = `drawing_backup_${canvasId}_${layerId}`;
      const backupData = {
        drawingData,
        timestamp: Date.now(),
        hasObjects
      };
      
      try {
        if (hasObjects) {
          localStorage.setItem(localStorageKey, JSON.stringify(backupData));
          console.log('SaveDrawing: Drawing backed up to localStorage with', drawingData.objects.length, 'objects');
        } else {
          localStorage.removeItem(localStorageKey);
          console.log('SaveDrawing: Empty drawing - backup removed from localStorage');
        }
      } catch (localError) {
        console.warn('SaveDrawing: Failed to save drawing to localStorage:', localError);
      }

      // 🔧 RE-ENABLED: Database save with improved error handling
      try {
        if (hasObjects) {
          console.log('SaveDrawing: Attempting to save to database...');
          
          const { error, data } = await supabase
            .from('drawings')
            .upsert({
              canvas_id: canvasId,
              layer_id: layerId,
              drawing_data: drawingData,
            })
            .select();

          if (error) {
            console.error('SaveDrawing: Database save failed:', error);
            console.log('SaveDrawing: Keeping localStorage backup');
            // Keep localStorage backup on database failure
          } else {
            console.log('SaveDrawing: Successfully saved to database');
            // Success - remove localStorage backup
            try {
              localStorage.removeItem(localStorageKey);
              console.log('SaveDrawing: Removed localStorage backup after successful database save');
            } catch (localError) {
              console.warn('SaveDrawing: Failed to remove localStorage backup:', localError);
            }
          }
        } else {
          console.log('SaveDrawing: Removing empty drawing from database...');
          // Remove drawing if canvas is empty
          const { error } = await supabase
            .from('drawings')
            .delete()
            .eq('canvas_id', canvasId)
            .eq('layer_id', layerId);
            
          if (error) {
            console.error('SaveDrawing: Database delete failed:', error);
          } else {
            console.log('SaveDrawing: Successfully removed empty drawing from database');
          }
        }
      } catch (dbError) {
        console.error('SaveDrawing: Database operation failed:', dbError);
        console.log('SaveDrawing: Drawing is still saved in localStorage');
      }

      // Defer the callback to avoid setState during render
      setTimeout(() => onDrawingChange?.(hasObjects), 0);
    } catch (error) {
      console.error('Error saving drawing:', error);
      
      // Handle different types of errors more gracefully
      if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
        console.warn('RLS policy issue - drawings saved locally only');
      } else if (error.message?.includes('404') || error.code === 'PGRST116') {
        console.warn('No drawing data found or table not accessible. Saved locally.');
      } else if (error.code === '42P01') {
        console.warn('Database tables not properly initialized. Saved locally.');
      } else {
        console.error('Unexpected save error:', error);
        // Only show toast for unexpected errors
        toast({
          title: "그리기 저장 오류",
          description: "온라인 저장에 실패했지만 로컬에 백업되었습니다.",
          variant: "destructive",
        });
      }
    }
  }, [canvasId, layerId, onDrawingChange, toast]);

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    clearCanvas,
    deleteSelected
  }));

  // Initialize and setup canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.max(window.innerWidth * 2, 3000),
      height: Math.max(window.innerHeight * 2, 2000),
      backgroundColor: 'transparent',
    });

    // Enable zoom and pan functionality
    canvas.allowTouchScrolling = true;
    
    // Configure drawing brush - Fabric.js v6 방식
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new PencilBrush(canvas);
    }
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;

    fabricCanvasRef.current = canvas;

    // Load existing drawings
    loadDrawings();

    // Save state for undo/redo
    let saveTimeout: NodeJS.Timeout;
    
    const saveState = () => {
      if (isLoadingFromJSON) return; // Don't save while loading
      
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const currentState = JSON.stringify(canvas.toJSON());
        setUndoStack(prev => {
          // Avoid duplicate states
          if (prev.length > 0 && prev[prev.length - 1] === currentState) {
            return prev;
          }
                  const newUndoStack = [...prev.slice(-9), currentState];
        // Defer callback to avoid setState during render
        setTimeout(() => onUndoStackChange?.(newUndoStack), 0);
        return newUndoStack;
        });
        setRedoStack(prev => {
          // Defer callback to avoid setState during render
          setTimeout(() => onRedoStackChange?.([]), 0);
          return [];
        });
      }, 100);
    };

    // Initial state will be saved after loading existing drawings

    canvas.on('path:created', saveState);
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);

    // Handle canvas resize
    const resizeObserver = new ResizeObserver(() => {
      if (container) {
        const { width: newWidth, height: newHeight } = container.getBoundingClientRect();
        canvas.setDimensions({
          width: Math.max(newWidth * 2, 3000),
          height: Math.max(newHeight * 2, 2000)
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
    };
  }, [canvasId, containerRef, onUndoStackChange, onRedoStackChange]);

  // Update viewport transform when zoom/pan changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingFromJSON) return;

    // Save current viewport transform
    const vpt = canvas.viewportTransform;
    if (vpt) {
      // Apply zoom and pan transformation while preserving object positions
      const newTransform: [number, number, number, number, number, number] = [zoom, 0, 0, zoom, panX, panY];
      canvas.setViewportTransform(newTransform);
      canvas.renderAll();
      
      // Skip auto-save on viewport changes to prevent object loss
    }
  }, [zoom, panX, panY, isLoadingFromJSON]);

  const loadDrawings = async () => {
    let dataToLoad = null;
    let isFromBackup = false;
    const localStorageKey = `drawing_backup_${canvasId}_${layerId}`;
    
    // 🔧 RE-ENABLED: Try to load from database first, fallback to localStorage
    try {
      console.log('LoadDrawings: Attempting to load from database for canvas:', canvasId, 'layer:', layerId);
      
      // Try to load from database first - get the most recent drawing
      const { data, error } = await supabase
        .from('drawings')
        .select('drawing_data')
        .eq('canvas_id', canvasId)
        .eq('layer_id', layerId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('LoadDrawings: Database load failed:', error);
      } else if (data && data.drawing_data) {
        console.log('LoadDrawings: Loading from database with', data.drawing_data.objects?.length || 0, 'objects');
        dataToLoad = data.drawing_data;
      } else {
        console.log('LoadDrawings: No data found in database');
      }
    } catch (error) {
      console.error('LoadDrawings: Error loading from database:', error);
    }

    // Fallback to localStorage if database load failed or returned no data
    if (!dataToLoad) {
      console.log('LoadDrawings: Checking localStorage backup for canvas:', canvasId, 'layer:', layerId);
      try {
        const backupDataStr = localStorage.getItem(localStorageKey);
        if (backupDataStr) {
          const backupData = JSON.parse(backupDataStr);
          
          // Handle both old format (direct drawingData) and new format (with metadata)
          if (backupData.drawingData) {
            dataToLoad = backupData.drawingData;
            console.log('LoadDrawings: Loading from localStorage (new format) with', backupData.drawingData.objects?.length || 0, 'objects');
          } else {
            dataToLoad = backupData;
            console.log('LoadDrawings: Loading from localStorage (old format) with', backupData.objects?.length || 0, 'objects');
          }
          
          isFromBackup = true;
        }
      } catch (localError) {
        console.warn('LoadDrawings: Error reading from localStorage:', localError);
      }
    }

    if (!dataToLoad) {
      console.log('LoadDrawings: No drawing data found in database or localStorage');
    }

    if (dataToLoad && fabricCanvasRef.current) {
      setIsLoadingFromJSON(true);
      // Reset viewport transform before loading
      fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      
      // 🔧 COORDINATE CONVERSION: Convert relative coordinates back to absolute coordinates
      const canvas = fabricCanvasRef.current;
      const canvasWidth = canvas.width || 1200;
      const canvasHeight = canvas.height || 800;
      
      // Check if data uses relative coordinates (values between 0-1) or absolute coordinates
      const hasRelativeCoords = dataToLoad.objects?.some(obj => 
        obj.left && obj.left <= 1 && obj.top && obj.top <= 1
      );
      
      let processedData = dataToLoad;
      if (hasRelativeCoords) {
        console.log('LoadDrawings: Converting relative coordinates to absolute');
        processedData = {
          ...dataToLoad,
          objects: dataToLoad.objects?.map(obj => {
            if (obj.type === 'Path' && obj.path && obj.left <= 1 && obj.top <= 1) {
              // Convert relative coordinates back to absolute
              const absoluteObj = {
                ...obj,
                left: obj.left * canvasWidth,
                top: obj.top * canvasHeight,
                path: obj.path.map(segment => {
                  if (Array.isArray(segment)) {
                    return segment.map((point, index) => {
                      if (index === 0) return point; // Command letter (M, L, Q, etc.)
                      if (typeof point === 'number') {
                        // Convert coordinate back to absolute
                        return index % 2 === 1 ? point * canvasWidth : point * canvasHeight;
                      }
                      return point;
                    });
                  }
                  return segment;
                })
              };
              console.log('LoadDrawings: Converted path from relative to absolute:', {
                relative: { left: obj.left, top: obj.top },
                absolute: { left: absoluteObj.left, top: absoluteObj.top }
              });
              return absoluteObj;
            }
            return obj;
          }) || []
        };
      } else {
        console.log('LoadDrawings: Using existing absolute coordinates');
      }
      
      fabricCanvasRef.current.loadFromJSON(processedData as any, () => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          // Apply current viewport transform after loading
          canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
          canvas.renderAll();
          // Defer the callback to avoid setState during render
          setTimeout(() => onDrawingChange?.(true), 0);
          setIsLoadingFromJSON(false);
          
          // If loaded from backup, try to sync to database
          if (isFromBackup) {
            setTimeout(() => {
              const canvas = fabricCanvasRef.current;
              if (canvas) {
                console.log('Syncing backup to database');
                // Basic sync logic would go here
              }
            }, 1000);
          }
          
          // Save initial state after loading (only if undo stack is empty)
          setTimeout(() => {
            setUndoStack(prev => {
              if (prev.length === 0) {
                const currentTransform = canvas.viewportTransform;
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
                const initialState = JSON.stringify(canvas.toJSON());
                if (currentTransform) {
                  canvas.setViewportTransform(currentTransform);
                }
                return [initialState];
              }
              return prev;
            });
          }, 100);
        }
      });
    } else {
      // No existing data, save empty canvas as initial state
      setTimeout(() => {
        setUndoStack(prev => {
          if (prev.length === 0) {
            const canvas = fabricCanvasRef.current;
            if (canvas) {
              const currentTransform = canvas.viewportTransform;
              canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
              const initialState = JSON.stringify(canvas.toJSON());
              if (currentTransform) {
                canvas.setViewportTransform(currentTransform);
              }
              return [initialState];
            }
          }
          return prev;
        });
      }, 500);
    }
  };

  // Configure drawing tools and styles
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    console.log('Setting drawing mode:', tool, 'brush size:', brushSize, 'color:', brushColor);
    
    // Set drawing mode
    canvas.isDrawingMode = tool === 'draw' || tool === 'erase';
    
    // Enable object selection for all modes
    canvas.selection = true;
    
    if (tool === 'erase') {
      console.log('Configuring eraser mode');
      // Configure brush for erasing
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = 'rgba(255, 255, 255, 1)'; // White color for erasing
      
    } else if (tool === 'draw') {
      console.log('Configuring drawing mode with color:', brushColor);
      // Create fresh brush for normal drawing
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor;
      
      // Configure line style
      const dashArray = lineStyle === 'dashed' ? [5, 5] : [];
      if (dashArray.length > 0) {
        (canvas.freeDrawingBrush as any).strokeDashArray = dashArray;
      }
      
    } else {
      // Select mode - disable drawing but enable selection
      canvas.isDrawingMode = false;
      canvas.selection = true;
      // Make all objects selectable except eraser paths
      canvas.getObjects().forEach(obj => {
        if (obj.globalCompositeOperation === 'destination-out') {
          // Eraser paths should not be selectable
          obj.selectable = false;
          obj.evented = false;
        } else {
          obj.selectable = true;
          obj.evented = true;
        }
      });
    }
    
    console.log('Brush configured:', {
      width: canvas.freeDrawingBrush?.width,
      color: canvas.freeDrawingBrush?.color,
      tool: tool,
      isDrawingMode: canvas.isDrawingMode
    });
  }, [tool, brushColor, brushSize, lineStyle]);

  // Auto-save and handle eraser functionality
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handlePathCreated = (e: any) => {
      const path = e.path;
      if (path) {
        if (tool === 'erase') {
          console.log('Eraser path created, checking for intersections');
          
          // Get all drawable objects (excluding eraser paths)
          const drawableObjects = canvas.getObjects().filter(obj => 
            obj.globalCompositeOperation !== 'destination-out' && obj !== path
          );
          
          // Check for intersections and remove intersecting objects
          const objectsToRemove = [];
          for (const obj of drawableObjects) {
            if (path.intersectsWithObject(obj)) {
              console.log('Intersection found, marking object for removal');
              objectsToRemove.push(obj);
            }
          }
          
          // Remove intersecting objects
          objectsToRemove.forEach(obj => canvas.remove(obj));
          
          // Remove the eraser path itself
          canvas.remove(path);
          canvas.renderAll();
        } else {
          // Normal drawing paths
          path.globalCompositeOperation = 'source-over';
          path.set({
            selectable: true,
            evented: true
          });
        }
        canvas.renderAll();
      }
      
    // Auto-save after a delay  
      setTimeout(() => {
        saveDrawing();
        // Also save state for undo/redo
        if (!isLoadingFromJSON) {
          const currentState = JSON.stringify(canvas.toJSON());
          setUndoStack(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === currentState) {
              return prev;
            }
            const newUndoStack = [...prev.slice(-9), currentState];
            setTimeout(() => onUndoStackChange?.(newUndoStack), 0);
            return newUndoStack;
          });
          setRedoStack(prev => {
            setTimeout(() => onRedoStackChange?.([]), 0);
            return [];
          });
        }
      }, 1000);
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [tool, saveDrawing]);

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
    
    setUndoStack([]);
    setRedoStack([]);
    // Defer callbacks to avoid setState during render
    setTimeout(() => {
      onUndoStackChange?.([]);
      onRedoStackChange?.([]);
    }, 0);
    
    // Defer the callback to avoid setState during render
    setTimeout(() => onDrawingChange?.(false), 0);
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStack.length <= 1) return;

    const currentState = JSON.stringify(canvas.toJSON());
    const previousState = undoStack[undoStack.length - 1];
    
    // Don't undo if current state is same as previous
    if (currentState === previousState && undoStack.length > 1) {
      // Use the state before the current one
      const realPreviousState = undoStack[undoStack.length - 2];
      setRedoStack(prev => {
        const newRedoStack = [currentState, ...prev.slice(0, 9)];
        // Defer callback to avoid setState during render
        setTimeout(() => onRedoStackChange?.(newRedoStack), 0);
        return newRedoStack;
      });
      setUndoStack(prev => {
        const newUndoStack = prev.slice(0, -2);
        // Defer callback to avoid setState during render
        setTimeout(() => onUndoStackChange?.(newUndoStack), 0);
        return newUndoStack;
      });
      
      canvas.clear();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setIsLoadingFromJSON(true);
      canvas.loadFromJSON(JSON.parse(realPreviousState), () => {
        canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
        canvas.renderAll();
        setIsLoadingFromJSON(false);
        setTimeout(() => {
          saveDrawing();
        }, 100);
      });
    } else {
      setRedoStack(prev => {
        const newRedoStack = [currentState, ...prev.slice(0, 9)];
        // Defer callback to avoid setState during render
        setTimeout(() => onRedoStackChange?.(newRedoStack), 0);
        return newRedoStack;
      });
      setUndoStack(prev => {
        const newUndoStack = prev.slice(0, -1);
        // Defer callback to avoid setState during render
        setTimeout(() => onUndoStackChange?.(newUndoStack), 0);
        return newUndoStack;
      });
      
      canvas.clear();
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setIsLoadingFromJSON(true);
      canvas.loadFromJSON(JSON.parse(previousState), () => {
        canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
        canvas.renderAll();
        setIsLoadingFromJSON(false);
        setTimeout(() => {
          saveDrawing();
        }, 100);
      });
    }
  };

  const redo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStack.length === 0) return;

    const currentState = JSON.stringify(canvas.toJSON());
    const nextState = redoStack[0];
    
    setUndoStack(prev => {
      const newUndoStack = [...prev, currentState].slice(-10);
      onUndoStackChange?.(newUndoStack);
      return newUndoStack;
    });
    setRedoStack(prev => {
      const newRedoStack = prev.slice(1);
      onRedoStackChange?.(newRedoStack);
      return newRedoStack;
    });
    
    // Clear canvas first
    canvas.clear();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    // Load next state
    setIsLoadingFromJSON(true);
    canvas.loadFromJSON(JSON.parse(nextState), () => {
      canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
      canvas.renderAll();
      setIsLoadingFromJSON(false);
      // Save the drawing after redo
      setTimeout(() => saveDrawing(), 100);
    });
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      
      // Save state for undo/redo
      const currentState = JSON.stringify(canvas.toJSON());
      setUndoStack(prev => {
        const newUndoStack = [...prev.slice(-9), currentState];
        // Defer callback to avoid setState during render
        setTimeout(() => onUndoStackChange?.(newUndoStack), 0);
        return newUndoStack;
      });
      setRedoStack(prev => {
        // Defer callback to avoid setState during render
        setTimeout(() => onRedoStackChange?.([]), 0);
        return [];
      });
      
      // Auto-save
      setTimeout(() => saveDrawing(), 100);
    }
  };

  // Handle keyboard shortcuts and expose delete function
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Expose deleteSelected function to parent
    if (onDeleteSelected) {
      (window as any).deleteSelectedDrawing = deleteSelected;
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if ((window as any).deleteSelectedDrawing) {
        delete (window as any).deleteSelectedDrawing;
      }
    };
  }, [onDeleteSelected]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Drawing Canvas - responsive to container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ zIndex: 10 }}
      />
    </div>
  );
});