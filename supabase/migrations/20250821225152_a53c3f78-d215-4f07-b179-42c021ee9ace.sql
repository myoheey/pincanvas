-- 캔버스 테이블에 공개 캔버스에 대한 읽기 권한 추가
CREATE POLICY "Enable read access for public canvases" 
ON public.canvases FOR SELECT 
USING (is_public = true);

-- 레이어 테이블에 공개 캔버스의 레이어에 대한 읽기 권한 추가
CREATE POLICY "Users can view layers of public canvases" 
ON public.layers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = layers.canvas_id 
    AND canvases.is_public = true
  )
);

-- 핀 테이블에 공개 캔버스의 핀에 대한 읽기 권한 추가
CREATE POLICY "Users can view pins of public canvases" 
ON public.pins FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND canvases.is_public = true
  )
);

-- 미디어 아이템 테이블에 공개 캔버스의 핀에 대한 읽기 권한 추가
CREATE POLICY "Users can view media items of public pins" 
ON public.media_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = media_items.pin_id 
    AND canvases.is_public = true
  )
);