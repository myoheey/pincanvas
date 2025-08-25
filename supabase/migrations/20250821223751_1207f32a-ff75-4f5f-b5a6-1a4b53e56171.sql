
-- 현재 문제가 있는 RLS 정책들을 삭제하고 새로 생성합니다

-- 레이어 테이블의 기존 정책 삭제
DROP POLICY IF EXISTS "Users can modify layers of canvases they own or have editor acc" ON public.layers;
DROP POLICY IF EXISTS "Users can view layers of accessible canvases" ON public.layers;

-- 핀 테이블의 기존 정책 삭제  
DROP POLICY IF EXISTS "Users can modify pins of canvases they own or have editor acces" ON public.pins;
DROP POLICY IF EXISTS "Users can view pins of accessible canvases" ON public.pins;

-- 미디어 아이템 테이블의 기존 정책 삭제
DROP POLICY IF EXISTS "Users can modify media items of pins they have editor access to" ON public.media_items;
DROP POLICY IF EXISTS "Users can view media items of accessible pins" ON public.media_items;

-- 사용자 이메일을 가져오는 보안 정의자 함수 생성
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 레이어 테이블의 새로운 RLS 정책
CREATE POLICY "Users can view layers of accessible canvases" 
ON public.layers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = layers.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = public.get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can modify layers of canvases they own or have editor access" 
ON public.layers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = layers.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = public.get_current_user_email()
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);

-- 핀 테이블의 새로운 RLS 정책
CREATE POLICY "Users can view pins of accessible canvases" 
ON public.pins FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = public.get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can modify pins of canvases they own or have editor access" 
ON public.pins FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = pins.canvas_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = public.get_current_user_email()
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);

-- 미디어 아이템 테이블의 새로운 RLS 정책
CREATE POLICY "Users can view media items of accessible pins" 
ON public.media_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = media_items.pin_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = public.get_current_user_email()
      )
    )
  )
);

CREATE POLICY "Users can modify media items of pins they have editor access to" 
ON public.media_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM pins 
    JOIN canvases ON canvases.id = pins.canvas_id 
    WHERE pins.id = media_items.pin_id 
    AND (
      canvases.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM canvas_shares 
        WHERE canvas_shares.canvas_id = canvases.id 
        AND canvas_shares.shared_with_email = public.get_current_user_email()
        AND canvas_shares.permission = 'editor'
      )
    )
  )
);
