import { formatVotePercentage } from "@polling-app/shared";

function sortOptions(options = []) {
  return [...options].sort((left, right) => left.position - right.position);
}

function pickLeadingOptionId(options) {
  const nonZeroOptions = options.filter((option) => option.voteCount > 0);

  if (!nonZeroOptions.length) {
    return null;
  }

  return nonZeroOptions.reduce((leader, candidate) => {
    if (candidate.voteCount > leader.voteCount) {
      return candidate;
    }

    return leader;
  }).id;
}

export function mapPollRowToDefinition(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    question: row.question,
    description: row.description,
    shareCode: row.share_code,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    options: sortOptions(row.poll_options).map((option) => ({
      id: option.id,
      label: option.label,
      position: option.position
    }))
  };
}

export function buildPollResultSnapshot(definition, countsByOptionId) {
  const totalVotes = definition.options.reduce((sum, option) => {
    return sum + Number(countsByOptionId[option.id] ?? 0);
  }, 0);

  const results = definition.options.map((option) => {
    const voteCount = Number(countsByOptionId[option.id] ?? 0);

    return {
      optionId: option.id,
      label: option.label,
      position: option.position,
      voteCount,
      percentage: formatVotePercentage(voteCount, totalVotes)
    };
  });

  const leadingOptionId = pickLeadingOptionId(
    results.map((result) => ({
      id: result.optionId,
      voteCount: result.voteCount
    }))
  );

  return {
    totalVotes,
    winnerOptionId: leadingOptionId,
    results
  };
}

export function buildPollState({ definition, countsByOptionId, viewerUserId, hasVoted }) {
  const snapshot = buildPollResultSnapshot(definition, countsByOptionId);

  return {
    poll: {
      id: definition.id,
      ownerId: definition.ownerId,
      question: definition.question,
      description: definition.description,
      shareCode: definition.shareCode,
      status: definition.status,
      expiresAt: definition.expiresAt,
      createdAt: definition.createdAt,
      totalVotes: snapshot.totalVotes,
      leadingOptionId: snapshot.winnerOptionId
    },
    options: snapshot.results.map((result) => ({
      id: result.optionId,
      label: result.label,
      position: result.position,
      voteCount: result.voteCount,
      percentage: result.percentage
    })),
    viewer: {
      isOwner: Boolean(viewerUserId && viewerUserId === definition.ownerId),
      hasVoted: Boolean(hasVoted)
    }
  };
}

export function buildPollStateFromResult({ definition, resultRow, viewerUserId }) {
  const options = sortOptions(resultRow.results_json ?? []).map((result) => ({
    id: result.optionId,
    label: result.label,
    position: result.position,
    voteCount: Number(result.voteCount ?? 0),
    percentage: Number(result.percentage ?? 0)
  }));

  return {
    poll: {
      id: definition.id,
      ownerId: definition.ownerId,
      question: definition.question,
      description: definition.description,
      shareCode: definition.shareCode,
      status: resultRow.final_status ?? definition.status,
      expiresAt: definition.expiresAt,
      createdAt: definition.createdAt,
      totalVotes: Number(resultRow.total_votes ?? 0),
      leadingOptionId: resultRow.winner_option_id ?? null
    },
    options,
    viewer: {
      isOwner: Boolean(viewerUserId && viewerUserId === definition.ownerId),
      hasVoted: false
    }
  };
}

