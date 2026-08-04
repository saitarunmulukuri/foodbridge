"""Marshmallow serialization schemas for the Decision Engine module."""

from marshmallow import Schema, fields, validate


class RecommendationSchema(Schema):
    """Schema for serializing Recommendation DTO instances."""

    donation_id = fields.Int(required=True)
    ngo_id = fields.Int(required=True)
    rank = fields.Int(required=True)
    total_score = fields.Float(required=True)
    distance_km = fields.Float(required=True)
    distance_score = fields.Float(required=True)
    capacity_score = fields.Float(required=True)
    compatibility_score = fields.Float(required=True)
    reliability_score_weighted = fields.Float(required=True)
    response_score = fields.Float(required=True)
    algorithm_version = fields.Str(required=True)


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


class DecisionEngineResultSchema(Schema):
    """Schema for serializing DecisionEngineResult value object."""

    donation_id = fields.Int(required=True)
    recommendations = fields.Nested(RecommendationSchema, many=True, required=True)
    total_candidates = fields.Int(required=True)
    total_eligible = fields.Int(required=True)
    total_scored = fields.Int(required=True)
    algorithm_version = fields.Str(required=True)
