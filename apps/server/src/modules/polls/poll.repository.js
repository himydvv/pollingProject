import { supabaseAdmin } from "../../lib/supabase.js";
import { mapPollRowToDefinition } from "./poll.mapper.js";

const POLL_SELECT = `
  id,
  owner_id,
  question,
  description,
  share_code,
  status,
  expires_at,
  created_at,
  poll_options (
    id,
    label,
    position
  )
`;

async function getPollByQuery(builder) {
  const { data, error } = await builder.maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPollRowToDefinition(data) : null;
}

export async function createPollWithOptions({
  ownerId,
  question,
  description,
  shareCode,
  expiresAt,
  optionLabels
}) {
  const { data, error } = await supabaseAdmin.rpc("create_poll_with_options", {
    p_owner_id: ownerId,
    p_question: question,
    p_description: description,
    p_share_code: shareCode,
    p_expires_at: expiresAt,
    p_option_labels: optionLabels
  });

  if (error) {
    throw error;
  }

  if (typeof data === "string") {
    return data;
  }

  const pollId = data?.poll_id ?? data?.[0]?.poll_id ?? null;

  if (!pollId) {
    throw new Error("create_poll_with_options did not return a poll id.");
  }

  return pollId;
}

export async function fetchPollById(pollId) {
  return getPollByQuery(supabaseAdmin.from("polls").select(POLL_SELECT).eq("id", pollId));
}

export async function fetchPollByShareCode(shareCode) {
  return getPollByQuery(
    supabaseAdmin.from("polls").select(POLL_SELECT).eq("share_code", shareCode.toUpperCase())
  );
}

export async function updatePollStatus(pollId, status) {
  const { data, error } = await supabaseAdmin
    .from("polls")
    .update({ status })
    .eq("id", pollId)
    .select("id, status")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchPollResult(pollId) {
  const { data, error } = await supabaseAdmin
    .from("poll_results")
    .select("*")
    .eq("poll_id", pollId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertPollResultSnapshot({
  pollId,
  finalStatus,
  totalVotes,
  winnerOptionId,
  finishedAt,
  results
}) {
  const { data, error } = await supabaseAdmin
    .from("poll_results")
    .upsert({
      poll_id: pollId,
      final_status: finalStatus,
      total_votes: totalVotes,
      winner_option_id: winnerOptionId,
      finished_at: finishedAt,
      results_json: results
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
