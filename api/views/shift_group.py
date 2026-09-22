"""
Views for managing ShiftGroups (admin-only "keep these ballkids on the same
team/shift" mappings).

Wire into api/urls.py:

    path("shift-groups", ShiftGroupListCreateView.as_view()),
    path("shift-groups/<int:pk>", ShiftGroupDetailView.as_view()),
"""

from rest_framework import generics

from api.models.shift_group import ShiftGroup
from api.permissions import IsChairperson
from api.serializers_shift_group import ShiftGroupSerializer


class ShiftGroupListCreateView(generics.ListCreateAPIView):
    queryset = ShiftGroup.objects.all().prefetch_related("ballkids")
    serializer_class = ShiftGroupSerializer
    permission_classes = [IsChairperson]


class ShiftGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ShiftGroup.objects.all().prefetch_related("ballkids")
    serializer_class = ShiftGroupSerializer
    permission_classes = [IsChairperson]
