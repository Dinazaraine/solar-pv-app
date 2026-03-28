import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# Change ceci avec ton nom + email (important pour Nominatim)
USER_AGENT = "SolarPVApp-Madagascar/1.0 (contact@tonemail.com)"

@csrf_exempt  # Supprime method_decorator, utilise csrf_exempt directement
def geocode(request):
    """ Recherche une adresse → coordonnées (Forward Geocoding) """
    query = request.GET.get('q')
    if not query:
        return JsonResponse({'error': 'Paramètre q manquant'}, status=400)

    url = f"https://nominatim.openstreetmap.org/search?format=jsonv2&q={query}&limit=5&addressdetails=1"
    
    headers = {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'fr'   # Pour avoir les noms en français quand possible
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return JsonResponse(response.json(), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt  # Supprime method_decorator, utilise csrf_exempt directement
def reverse_geocode(request):
    """ Coordonnées → adresse + région (Reverse Geocoding) """
    lat = request.GET.get('lat')
    lon = request.GET.get('lon')

    if not lat or not lon:
        return JsonResponse({'error': 'lat et lon sont requis'}, status=400)

    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=18&addressdetails=1"

    headers = {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'fr'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return JsonResponse(response.json(), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)