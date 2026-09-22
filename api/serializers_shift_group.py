from rest_framework import serializers

from api.models.shift_group import ShiftGroup


class ShiftGroupSerializer(serializers.ModelSerializer):
    ballkid_names = serializers.SerializerMethodField()

    class Meta:
        model = ShiftGroup
        fields = ["id", "name", "ballkids", "ballkid_names", "created_at"]

    def get_ballkid_names(self, obj):
        return [
            f"{b.first_name} {b.last_name}" for b in obj.ballkids.all()
        ]

    def validate_ballkids(self, value):
        if len(value) < 2:
            raise serializers.ValidationError(
                "A shift group needs at least 2 ballkids -- otherwise there's nothing to keep together."
            )
        return value
