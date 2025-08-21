-- 캔버스 테이블에 공개 권한과 댓글/좋아요 설정 컬럼 추가
ALTER TABLE public.canvases 
ADD COLUMN public_permission TEXT DEFAULT 'viewer' CHECK (public_permission IN ('viewer', 'editor')),
ADD COLUMN allow_comments BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN allow_likes BOOLEAN NOT NULL DEFAULT true;

-- 댓글 테이블 생성
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  author_email TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 좋아요 테이블 생성
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  author_email TEXT,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pin_id, author_email)
);

-- 댓글 테이블 RLS 활성화
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 좋아요 테이블 RLS 활성화  
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 댓글 정책: 댓글이 허용된 공개 캔버스나 접근 가능한 캔버스의 핀에 대해서만
CREATE POLICY "Users can view comments of accessible pins" 
ON public.comments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = comments.pin_id 
    AND canvases.allow_comments = true
    AND (
      canvases.is_public = true 
      OR canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can create comments on accessible pins" 
ON public.comments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = comments.pin_id 
    AND canvases.allow_comments = true
    AND (
      canvases.is_public = true 
      OR canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE 
USING (
  author_email = get_current_user_email() 
  OR EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = comments.pin_id 
    AND canvases.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own comments or canvas owners can delete" 
ON public.comments FOR DELETE 
USING (
  author_email = get_current_user_email() 
  OR EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = comments.pin_id 
    AND canvases.owner_id = auth.uid()
  )
);

-- 좋아요 정책: 좋아요가 허용된 공개 캔버스나 접근 가능한 캔버스의 핀에 대해서만
CREATE POLICY "Users can view likes of accessible pins" 
ON public.likes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = likes.pin_id 
    AND canvases.allow_likes = true
    AND (
      canvases.is_public = true 
      OR canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can create likes on accessible pins" 
ON public.likes FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = likes.pin_id 
    AND canvases.allow_likes = true
    AND (
      canvases.is_public = true 
      OR canvases.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can delete their own likes" 
ON public.likes FOR DELETE 
USING (author_email = get_current_user_email());

-- 기존 캔버스들에 기본값 설정
UPDATE public.canvases SET public_permission = 'viewer', allow_comments = true, allow_likes = true;

-- 업데이트 트리거 추가
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();