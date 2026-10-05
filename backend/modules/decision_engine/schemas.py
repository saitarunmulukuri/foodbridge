"""Marshmallow serialization schemas for the Decision Engine module."""

from marshmallow import Schema, fields, validate


class RecommendationSchema(Schema):
    """Schema for serializing Recommendation DTO instances."""

    donation_id = fields.Int(required=True)
    ngo_id = fields.Int(required=True)
    ngo_name = fields.Str(dump_default="")
    rank = fields.Int(required=True)
    total_score = fields.Float(required=True)
    distance_km = fields.Float(required=True)
    distance_score = fields.Float(required=True)
    capacity_score = fields.Float(required=True)
    freshness_score = fields.Float(dump_default=0.0)
    demand_score = fields.Float(dump_default=0.0)
    compatibility_score = fields.Float(required=True)
    availability_score = fields.Float(dump_default=0.0)
    reliability_score_weighted = fields.Float(dump_default=0.0)
    response_score = fields.Float(dump_default=0.0)
    decision_reason = fields.Str(dump_default="")
    algorithm_version = fields.Str(required=True)


class CandidateEvaluationSchema(Schema):
    """Schema for serializing CandidateEvaluation audit DTOs."""

    ngo_id = fields.Int(required=True)
    ngo_name = fields.Str(dump_default="")
    eligible = fields.Bool(required=True)
    rejection_reason = fields.Str(allow_none=True)
    distance_km = fields.Float(allow_none=True)
    distance_score = fields.Float(allow_none=True)
    capacity_score = fields.Float(allow_none=True)
    freshness_score = fields.Float(allow_none=True)
    demand_score = fields.Float(allow_none=True)
    compatibility_score = fields.Float(allow_none=True)
    availability_score = fields.Float(allow_none=True)
    total_score = fields.Float(allow_none=True)
    decision_reason = fields.Str(allow_none=True)


class DecisionEngineRunRequestSchema(Schema):
    """Schema for validating POST /api/v1/decision-engine/run payload."""

    donation_id = fields.Int(
        required=True,
        validate=validate.Range(min=1, error="donation_id must be a positive integer."),
    )
    top_n = fields.Int(
        required=False,
        allow_none=True,
        validate=validate.Range(min=1, error="top_n must be at least 1."),
    )
    persist = fields.Bool(required=False, load_default=True)


class DecisionEngineResultSchema(Schema):
    """Schema for serializing DecisionEngineResult value object."""

    donation_id = fields.Int(required=True)
    selected_ngo_id = fields.Int(allow_none=True)
    selected_ngo_name = fields.Str(allow_none=True)
    score = fields.Float(allow_none=True)
    decision_reason = fields.Str(allow_none=True)
    recommendations = fields.Nested(RecommendationSchema, many=True, required=True)
    candidates = fields.Nested(CandidateEvaluationSchema, many=True, dump_default=[])
    total_candidates = fields.Int(required=True)
    total_eligible = fields.Int(required=True)
    total_scored = fields.Int(required=True)
    algorithm_version = fields.Str(required=True)

