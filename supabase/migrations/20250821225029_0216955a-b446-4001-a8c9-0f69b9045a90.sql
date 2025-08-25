-- 캔버스 테이블에 공개/비공개 상태를 관리하는 컬럼 추가
ALTER TABLE public.canvases 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- 기존 캔버스들을 모두 비공개로 설정
UPDATE public.canvases SET is_public = FALSE;