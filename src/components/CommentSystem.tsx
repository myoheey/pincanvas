import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_email?: string;
  created_at: string;
  updated_at: string;
}

interface Like {
  id: string;
  author_name: string;
  author_email?: string;
  created_at: string;
}

interface CommentSystemProps {
  pinId: string;
  canvasId: string;
  canvasOwnerId: string;
  allowComments: boolean;
  allowLikes: boolean;
  isOwner: boolean;
  isPublicCanvas?: boolean;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  pinId,
  canvasId,
  canvasOwnerId,
  allowComments,
  allowLikes,
  isOwner,
  isPublicCanvas = false,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canSeeEmails, setCanSeeEmails] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchLikes();
    checkEmailPermissions();
    
    // Set default author name from user profile
    if (user?.email) {
      setAuthorName(user.email.split('@')[0]);
    }
  }, [pinId, canvasId, user]);

  const checkEmailPermissions = async () => {
    // Anonymous users never see emails
    if (!user) {
      setCanSeeEmails(false);
      return;
    }
    
    // Canvas owners can always see emails
    if (isOwner) {
      setCanSeeEmails(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('user_can_see_emails_for_canvas', { canvas_id: canvasId });
      
      if (error) {
        console.error('Error checking email permissions:', error);
        setCanSeeEmails(false);
      } else {
        setCanSeeEmails(data || false);
      }
    } catch (error) {
      console.error('Error checking email permissions:', error);
      setCanSeeEmails(false);
    }
  };

  const fetchComments = async () => {
    if (!allowComments) return;
    
    const { data, error } = await supabase
      .from('secure_comments')
      .select('*')
      .eq('pin_id', pinId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
    }
  };

  const fetchLikes = async () => {
    if (!allowLikes) return;
    
    const { data, error } = await supabase
      .from('secure_likes')
      .select('*')
      .eq('pin_id', pinId);

    if (error) {
      console.error('Error fetching likes:', error);
    } else {
      setLikes(data || []);
      
      // Check if current user liked this pin
      const userEmail = user?.email;
      if (userEmail) {
        // Try email matching first (if available in secure view)
        const emailMatch = data?.some(like => like.author_email === userEmail);
        if (emailMatch) {
          setIsLiked(true);
        } else {
          // Fallback to name matching for anonymous users
          const userName = userEmail.split('@')[0];
          setIsLiked(data?.some(like => like.author_name === userName) || false);
        }
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !authorName.trim() || loading) return;

    setLoading(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        pin_id: pinId,
        content: newComment.trim(),
        author_name: authorName.trim(),
        author_email: canSeeEmails ? (user?.email || null) : null,
      });

    if (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "오류",
        description: "댓글을 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } else {
      setNewComment('');
      fetchComments();
      toast({
        title: "댓글 추가됨",
        description: "댓글이 성공적으로 추가되었습니다.",
      });
    }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "오류",
        description: "댓글을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } else {
      fetchComments();
      toast({
        title: "댓글 삭제됨",
        description: "댓글이 성공적으로 삭제되었습니다.",
      });
    }
  };

  const handleToggleLike = async () => {
    if (!allowLikes || loading || !authorName.trim()) return;

    setLoading(true);
    
    if (isLiked) {
      // Remove like - try both email and name matching for compatibility
      let deleteQuery = supabase
        .from('likes')
        .delete()
        .eq('pin_id', pinId);
      
      if (canSeeEmails && user?.email) {
        deleteQuery = deleteQuery.eq('author_email', user.email);
      } else {
        deleteQuery = deleteQuery.eq('author_name', authorName.trim());
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error('Error removing like:', error);
        toast({
          title: "오류",
          description: "좋아요를 제거하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } else {
        setIsLiked(false);
        fetchLikes();
      }
    } else {
      // Add like
      const { error } = await supabase
        .from('likes')
        .insert({
          pin_id: pinId,
          author_name: authorName.trim(),
          author_email: canSeeEmails ? (user?.email || null) : null,
        });

      if (error) {
        console.error('Error adding like:', error);
        toast({
          title: "오류", 
          description: "좋아요를 추가하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } else {
        setIsLiked(true);
        fetchLikes();
      }
    }
    setLoading(false);
  };

  const canDeleteComment = (comment: Comment) => {
    if (isOwner) return true;
    
    // If we can see emails, use email matching
    if (canSeeEmails && user?.email && comment.author_email) {
      return comment.author_email === user.email;
    }
    
    // For public access, use name matching as fallback
    if (user?.email) {
      const userName = user.email.split('@')[0];
      return comment.author_name === userName;
    }
    
    return false;
  };

  if (!allowComments && !allowLikes) return null;

  return (
    <div className="space-y-4">
      {/* Like Section */}
      {allowLikes && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleLike}
            disabled={loading}
            className={`gap-2 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likes.length}</span>
          </Button>
          {likes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {likes.slice(0, 3).map(like => like.author_name).join(', ')}
              {likes.length > 3 && ` 외 ${likes.length - 3}명`}
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      {allowComments && (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              댓글 {comments.length}개
            </div>

            {/* Add Comment */}
            <Card className="p-4">
              <div className="space-y-3">
                <Input
                  placeholder="이름을 입력하세요"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="text-sm"
                />
                <Textarea
                  placeholder="댓글을 입력하세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || !authorName.trim() || loading}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  댓글 작성
                </Button>
              </div>
            </Card>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                    {canDeleteComment(comment) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};