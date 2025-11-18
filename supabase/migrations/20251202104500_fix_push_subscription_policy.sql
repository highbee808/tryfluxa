-- Ensure users can insert/update their own push subscriptions
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage own subscriptions"
ON push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
