from django.urls import path
from . import views

urlpatterns = [
    path('geocode/', views.geocode, name='geocode'),
    path('reverse-geocode/', views.reverse_geocode, name='reverse_geocode'),
]