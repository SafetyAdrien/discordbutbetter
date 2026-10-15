-- Atomic position shifting for channel duplication / reordering.
--
-- The client used to loop over the affected channels and await one UPDATE per
-- row, ignoring the returned errors. A failure halfway through left every
-- subsequent channel shifted by +1 permanently, with nothing reported to the
-- user. Doing the shift in one server-side statement makes it atomic: either
-- every position moves, or none does.
--
-- Positions are dense within their scope (a category, or the uncategorised
-- group of a server), so "everything at or after _new_position, excluding the
-- channel being moved" is exactly the set that must shift.

CREATE OR REPLACE FUNCTION public.duplicate_channel_shift(
  _channel_id uuid,
  _new_position integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id uuid;
  _category_id uuid;
  _current_position integer;
  _affected integer;
BEGIN
  SELECT server_id, category_id, COALESCE(position, 0)
    INTO _server_id, _category_id, _current_position
  FROM public.channels
  WHERE id = _channel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel % not found', _channel_id;
  END IF;

  -- RLS is bypassed by SECURITY DEFINER, so re-check membership explicitly:
  -- the caller must belong to the server that owns the channel.
  IF NOT public.is_server_member(auth.uid(), _server_id) THEN
    RAISE EXCEPTION 'Not a member of this server';
  END IF;

  IF _current_position = _new_position THEN
    RETURN 0;
  END IF;

  -- Moving down (to a higher position): shift the block between the two
  -- positions up by one, closing the gap.
  IF _new_position > _current_position THEN
    UPDATE public.channels
    SET position = position - 1
    WHERE server_id = _server_id
      AND category_id IS NOT DISTINCT FROM _category_id
      AND id <> _channel_id
      AND position > _current_position
      AND position <= _new_position;

  -- Moving up (to a lower position): shift the block between them down by one.
  ELSE
    UPDATE public.channels
    SET position = position + 1
    WHERE server_id = _server_id
      AND category_id IS NOT DISTINCT FROM _category_id
      AND id <> _channel_id
      AND position >= _new_position
      AND position < _current_position;
  END IF;

  GET DIAGNOSTICS _affected = ROW_COUNT;
  RETURN _affected;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_channel_shift(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.duplicate_channel_shift(uuid, integer) TO authenticated;