-- Remove the problematic views and use application-level filtering instead
DROP VIEW IF EXISTS public.comments_with_conditional_email;
DROP VIEW IF EXISTS public.likes_with_conditional_email;

-- Keep the helper function for use in application logic
-- The user_can_see_emails_for_canvas function will be called from the application
-- to determine whether to show email addresses