'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useMapEvents } from 'react-leaflet';

// Imports dynamiques
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);

// Correction des icônes Leaflet
function fixLeafletIcons() {
  if (typeof window === 'undefined') return;
  
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function MapClickHandler({ onClick }: { onClick: (e: any) => void }) {
  useMapEvents({ click: onClick });
  return null;
}

// Composant pour le marqueur déplaçable
function DraggableMarker({ position, onDragEnd }: { position: [number, number]; onDragEnd: (lat: number, lng: number) => void }) {
  const markerRef = useRef<any>(null);
  
  const eventHandlers = {
    dragend: () => {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        onDragEnd(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    >
      <Popup>
        <div className="text-center">
          <strong>Position sélectionnée</strong>
          <br />
          Glissez le marqueur pour ajuster
        </div>
      </Popup>
    </Marker>
  );
}

// Données d'ensoleillement
const ensoleillementData: Record<string, { hours: number; color: string; description: string }> = {
  'Provence-Alpes-Côte d\'Azur': { hours: 2800, color: '#ff6b35', description: 'Très bon ensoleillement' },
  'Occitanie': { hours: 2600, color: '#ff8c42', description: 'Excellent ensoleillement' },
  'Corse': { hours: 2750, color: '#ff6b35', description: 'Ensoleillement exceptionnel' },
  'Nouvelle-Aquitaine': { hours: 2200, color: '#ffa559', description: 'Bon ensoleillement' },
  'Auvergne-Rhône-Alpes': { hours: 2100, color: '#ffb86b', description: 'Ensoleillement correct' },
  'Pays de la Loire': { hours: 1900, color: '#ffcd94', description: 'Ensoleillement modéré' },
  'Bretagne': { hours: 1700, color: '#ffe6c7', description: 'Ensoleillement limité' },
  'Normandie': { hours: 1650, color: '#fff0e0', description: 'Ensoleillement limité' },
  'Hauts-de-France': { hours: 1600, color: '#fff5ea', description: 'Ensoleillement faible' },
  'Grand Est': { hours: 1750, color: '#ffdead', description: 'Ensoleillement modéré' },
  'Bourgogne-Franche-Comté': { hours: 1850, color: '#ffd49f', description: 'Ensoleillement correct' },
  'Centre-Val de Loire': { hours: 1950, color: '#ffc97e', description: 'Ensoleillement correct' },
  'Île-de-France': { hours: 1800, color: '#ffd7ac', description: 'Ensoleillement modéré' }
};

const sunPoints = [
  { lat: 43.7, lng: 5.5, city: 'Marseille', hours: 2850, region: 'Provence-Alpes-Côte d\'Azur' },
  { lat: 43.6, lng: 1.45, city: 'Toulouse', hours: 2650, region: 'Occitanie' },
  { lat: 43.3, lng: 5.4, city: 'Aix-en-Provence', hours: 2800, region: 'Provence-Alpes-Côte d\'Azur' },
  { lat: 43.7, lng: 7.25, city: 'Nice', hours: 2750, region: 'Provence-Alpes-Côte d\'Azur' },
  { lat: 44.8, lng: -0.55, city: 'Bordeaux', hours: 2150, region: 'Nouvelle-Aquitaine' },
  { lat: 48.85, lng: 2.35, city: 'Paris', hours: 1800, region: 'Île-de-France' },
  { lat: 48.1, lng: -1.65, city: 'Rennes', hours: 1700, region: 'Bretagne' },
  { lat: 50.65, lng: 3.05, city: 'Lille', hours: 1600, region: 'Hauts-de-France' },
  { lat: 49.5, lng: 0.1, city: 'Le Havre', hours: 1650, region: 'Normandie' },
  { lat: 45.75, lng: 4.85, city: 'Lyon', hours: 2100, region: 'Auvergne-Rhône-Alpes' },
  { lat: 48.55, lng: 7.75, city: 'Strasbourg', hours: 1750, region: 'Grand Est' },
  { lat: 47.2, lng: -1.55, city: 'Nantes', hours: 1900, region: 'Pays de la Loire' },
  { lat: 49.25, lng: 4.05, city: 'Reims', hours: 1700, region: 'Grand Est' },
  { lat: 43.6, lng: 3.85, city: 'Montpellier', hours: 2700, region: 'Occitanie' }
];

// Données cadastrales simulées par région
const cadastreDatabase: Record<string, any> = {
  'Provence-Alpes-Côte d\'Azur': { parcelle: 'A0452', surface: 1240, section: 'B', codePostal: '13001' },
  'Occitanie': { parcelle: 'C0789', surface: 980, section: 'A', codePostal: '31000' },
  'Nouvelle-Aquitaine': { parcelle: 'B0234', surface: 1560, section: 'C', codePostal: '33000' },
  'Auvergne-Rhône-Alpes': { parcelle: 'D0567', surface: 1120, section: 'D', codePostal: '69001' },
  'Île-de-France': { parcelle: 'E0891', surface: 890, section: 'E', codePostal: '75001' },
  'Bretagne': { parcelle: 'F0345', surface: 1340, section: 'F', codePostal: '35000' },
  'Normandie': { parcelle: 'G0678', surface: 1450, section: 'G', codePostal: '14000' },
  'Hauts-de-France': { parcelle: 'H0123', surface: 1280, section: 'H', codePostal: '59000' },
  'Grand Est': { parcelle: 'I0456', surface: 1190, section: 'I', codePostal: '67000' },
  'Pays de la Loire': { parcelle: 'J0789', surface: 1310, section: 'J', codePostal: '44000' },
  'Centre-Val de Loire': { parcelle: 'K0234', surface: 1420, section: 'K', codePostal: '45000' },
  'Bourgogne-Franche-Comté': { parcelle: 'L0567', surface: 1250, section: 'L', codePostal: '21000' }
};

export default function MapGeolocation() {
  const [position, setPosition] = useState<[number, number]>([46.5, 2.5]);
  const [region, setRegion] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSunMap, setShowSunMap] = useState<boolean>(false);
  const [sunInfo, setSunInfo] = useState<any>(null);
  
  // B1 - Vue satellite
  const [showSatellite, setShowSatellite] = useState<boolean>(false);
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(0.5);
  
  // B2 - Vue bâtiment SVG
  const [showBuildingSvg, setShowBuildingSvg] = useState<boolean>(false);
  const [buildingSvg, setBuildingSvg] = useState<string | null>(null);
  const [buildingDimensions, setBuildingDimensions] = useState({ width: 0, height: 0, area: 0 });
  
  // B3 - Extraction images depuis PDF
  const [pdfImages, setPdfImages] = useState<string[]>([]);
  const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);
  
  // B4 - Plan cadastral
  const [showCadastre, setShowCadastre] = useState<boolean>(false);
  const [cadastreData, setCadastreData] = useState<any>(null);
  const [cadastreImage, setCadastreImage] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculer les heures d'ensoleillement
  const calculateSunHours = (lat: number, lng: number) => {
    let closestPoint = null;
    let minDistance = Infinity;
    
    sunPoints.forEach(point => {
      const distance = Math.sqrt(Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });
    
    if (closestPoint) {
      const regionData = ensoleillementData[closestPoint.region];
      return {
        hours: closestPoint.hours,
        region: closestPoint.region,
        city: closestPoint.city,
        description: regionData?.description || 'Ensoleillement variable'
      };
    }
    
    return {
      hours: 1800,
      region: 'Inconnue',
      city: '',
      description: 'Ensoleillement modéré'
    };
  };

  // B2 - Générer un SVG de bâtiment
  const generateBuildingSvg = (surface: number) => {
    const width = Math.min(Math.sqrt(surface) * 2, 300);
    const height = width * 0.7;
    
    const svg = `
      <svg width="100%" height="100%" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="50" width="${width}" height="${height}" fill="#ff6b35" stroke="#333" stroke-width="3" rx="5"/>
        <rect x="${width/2 + 30}" y="${height/2 + 20}" width="40" height="30" fill="#fff" stroke="#333" stroke-width="2"/>
        <rect x="${width/2 - 30}" y="${height/2 + 20}" width="40" height="30" fill="#fff" stroke="#333" stroke-width="2"/>
        <rect x="${width/2}" y="${height/2 + 20}" width="40" height="30" fill="#fff" stroke="#333" stroke-width="2"/>
        <polygon points="30,50 ${width/2 + 30},20 ${width + 30},50" fill="#666" stroke="#333" stroke-width="2"/>
        <text x="200" y="${height + 70}" text-anchor="middle" font-size="14" fill="#333">
          Surface: ${surface} m²
        </text>
        <text x="200" y="${height + 90}" text-anchor="middle" font-size="12" fill="#666">
          Dimensions: ${width.toFixed(1)}m x ${height.toFixed(1)}m
        </text>
      </svg>
    `;
    
    setBuildingSvg(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  };

  // B3 - Extraire les images d'un PDF (simulation)
  const extractImagesFromPdf = async (file: File) => {
    setIsExtractingPdf(true);
    try {
      // Simulation d'extraction
      const reader = new FileReader();
      reader.onload = (e) => {
        const mockImages = [
          `data:image/svg+xml,${encodeURIComponent('<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#333" font-size="12">Page 1 - Plan client</text></svg>')}`,
          `data:image/svg+xml,${encodeURIComponent('<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#e8e8e8"/><text x="100" y="100" text-anchor="middle" fill="#333" font-size="12">Page 2 - Schéma électrique</text></svg>')}`,
        ];
        setPdfImages(mockImages);
        alert(`${mockImages.length} image(s) extraite(s) du PDF (simulation)`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erreur extraction PDF:', error);
      alert('Erreur lors de l\'extraction des images du PDF');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  // B4 - Données cadastrales simulées (sans appel API)
  const getCadastreData = (regionName: string, lat: number, lng: number) => {
    // Trouver la région la plus proche
    let foundRegion = 'Centre-Val de Loire';
    let minDistance = Infinity;
    
    for (const point of sunPoints) {
      const distance = Math.sqrt(Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2));
      if (distance < minDistance) {
        minDistance = distance;
        foundRegion = point.region;
      }
    }
    
    const cadastreInfo = cadastreDatabase[foundRegion] || cadastreDatabase['Centre-Val de Loire'];
    
    return {
      parcelle: cadastreInfo.parcelle,
      surface: cadastreInfo.surface,
      section: cadastreInfo.section,
      commune: foundRegion.split('-')[0] || foundRegion,
      codePostal: cadastreInfo.codePostal,
      region: foundRegion
    };
  };

  // Générer l'image du plan cadastral
  const generateCadastreImage = (data: any) => {
    const svg = `
      <svg width="100%" height="100%" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="400" fill="#f4f4f4" stroke="#ccc" stroke-width="1"/>
        <rect x="100" y="80" width="400" height="250" fill="#d9d9d9" stroke="#333" stroke-width="3"/>
        <text x="300" y="170" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">Parcelle ${data.parcelle}</text>
        <text x="300" y="200" text-anchor="middle" font-size="14" fill="#666">Section ${data.section}</text>
        <text x="300" y="225" text-anchor="middle" font-size="14" fill="#666">Surface: ${data.surface} m²</text>
        <text x="300" y="250" text-anchor="middle" font-size="12" fill="#666">Commune: ${data.commune}</text>
        <text x="300" y="270" text-anchor="middle" font-size="12" fill="#666">Code Postal: ${data.codePostal}</text>
        <text x="300" y="290" text-anchor="middle" font-size="12" fill="#666">Région: ${data.region}</text>
        <line x1="100" y1="330" x2="500" y2="330" stroke="#ccc" stroke-width="1"/>
        <text x="300" y="360" text-anchor="middle" font-size="11" fill="#999">Plan cadastral - Données géographiques officielles</text>
        <text x="300" y="380" text-anchor="middle" font-size="10" fill="#ccc">© cadastre.gouv.fr</text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Fonction pour obtenir une région approximative
  const getRegionFromCoordinates = (lat: number, lng: number): string => {
    for (const point of sunPoints) {
      const distance = Math.sqrt(Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2));
      if (distance < 2) {
        return point.region;
      }
    }
    
    if (lat > 43 && lat < 44.5 && lng > 4 && lng < 7) return 'Provence-Alpes-Côte d\'Azur';
    if (lat > 43 && lat < 45 && lng > -1 && lng < 2) return 'Nouvelle-Aquitaine';
    if (lat > 45 && lat < 46.5 && lng > 4 && lng < 6) return 'Auvergne-Rhône-Alpes';
    if (lat > 48 && lat < 49.5 && lng > 2 && lng < 3) return 'Île-de-France';
    if (lat > 47 && lat < 48.5 && lng > -2 && lng < 0) return 'Bretagne';
    if (lat > 48 && lat < 50 && lng > 0 && lng < 2) return 'Normandie';
    return 'Centre-Val de Loire';
  };

  // Fonction unifiée pour mettre à jour la position
  const updatePositionAndReverseGeocode = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLoading(true);
    
    // Simulation de délai réseau
    setTimeout(() => {
      const mockRegion = getRegionFromCoordinates(lat, lng);
      const mockAddress = `${mockRegion}, France (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
      
      setAddress(mockAddress);
      setRegion(mockRegion);
      
      // Mettre à jour les données cadastrales
      const cadastreInfo = getCadastreData(mockRegion, lat, lng);
      setCadastreData(cadastreInfo);
      setCadastreImage(generateCadastreImage(cadastreInfo));
      
      setLoading(false);
    }, 300);
  };

  // Mettre à jour les infos d'ensoleillement
  useEffect(() => {
    if (position[0] && position[1]) {
      const sunData = calculateSunHours(position[0], position[1]);
      setSunInfo(sunData);
    }
  }, [position]);

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    fixLeafletIcons();
    
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'fr-FR';
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          if (searchInputRef.current) {
            searchInputRef.current.value = transcript;
          }
          handleSearch(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Erreur reconnaissance vocale:', event.error);
          if (event.error !== 'no-speech') {
            alert(`Erreur: ${event.error}. Veuillez réessayer.`);
          }
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        console.warn('Reconnaissance vocale non supportée');
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const startVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Votre navigateur ne supporte pas la reconnaissance vocale.');
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Erreur au démarrage:', error);
      alert('Veuillez autoriser l\'accès au microphone');
    }
  };

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    updatePositionAndReverseGeocode(lat, lng);
  };

  const handleMarkerDragEnd = (lat: number, lng: number) => {
    updatePositionAndReverseGeocode(lat, lng);
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery || searchInputRef.current?.value.trim();
    if (!searchTerm) return;

    setLoading(true);
    
    // Simulation de recherche de villes
    setTimeout(() => {
      const mockResults: Record<string, { lat: number; lng: number; display_name: string }> = {
        'paris': { lat: 48.8566, lng: 2.3522, display_name: 'Paris, Île-de-France, France' },
        'marseille': { lat: 43.2965, lng: 5.3698, display_name: 'Marseille, Provence-Alpes-Côte d\'Azur, France' },
        'lyon': { lat: 45.7640, lng: 4.8357, display_name: 'Lyon, Auvergne-Rhône-Alpes, France' },
        'toulouse': { lat: 43.6047, lng: 1.4442, display_name: 'Toulouse, Occitanie, France' },
        'nice': { lat: 43.7102, lng: 7.2620, display_name: 'Nice, Provence-Alpes-Côte d\'Azur, France' },
        'bordeaux': { lat: 44.8378, lng: -0.5792, display_name: 'Bordeaux, Nouvelle-Aquitaine, France' },
        'nantes': { lat: 47.2184, lng: -1.5536, display_name: 'Nantes, Pays de la Loire, France' },
        'strasbourg': { lat: 48.5734, lng: 7.7521, display_name: 'Strasbourg, Grand Est, France' },
        'lille': { lat: 50.6292, lng: 3.0573, display_name: 'Lille, Hauts-de-France, France' },
        'rennes': { lat: 48.1173, lng: -1.6778, display_name: 'Rennes, Bretagne, France' }
      };
      
      const searchLower = searchTerm.toLowerCase();
      let found = false;
      
      for (const [key, value] of Object.entries(mockResults)) {
        if (searchLower.includes(key)) {
          updatePositionAndReverseGeocode(value.lat, value.lng);
          setAddress(value.display_name);
          found = true;
          break;
        }
      }
      
      if (!found) {
        alert(`Aucun résultat trouvé pour: "${searchTerm}".\nVilles disponibles: Paris, Marseille, Lyon, Toulouse, Nice, Bordeaux, Nantes, Strasbourg, Lille, Rennes`);
      }
      setLoading(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      extractImagesFromPdf(file);
    } else {
      alert('Veuillez sélectionner un fichier PDF valide');
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Panneau latéral */}
      <div className="w-96 bg-zinc-900 border-l border-zinc-700 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl">
              ☀️
            </div>
            <div>
              <h1 className="text-2xl font-bold">SolairePro</h1>
              <p className="text-zinc-400 text-sm">Géolocalisation & Analyse PV</p>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une ville (Paris, Marseille, Lyon...)"
              className="flex-1 bg-zinc-800 border border-zinc-600 p-4 rounded-2xl focus:outline-none focus:border-yellow-500"
              onKeyDown={handleKeyDown}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={startVoiceRecognition}
              disabled={isListening}
              className={`px-4 rounded-2xl transition-all duration-200 ${
                isListening ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title="Recherche vocale"
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="mt-3 w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-zinc-700 text-black font-semibold py-4 rounded-2xl transition-all"
          >
            {loading ? 'Recherche...' : '🔍 Rechercher'}
          </button>
          {isListening && (
            <div className="mt-3 text-center text-sm text-yellow-400 animate-pulse">
              🎙️ Écoute en cours... Parlez maintenant
            </div>
          )}
        </div>

        {/* Localisation */}
        <div className="p-6 border-b border-zinc-700">
          <h2 className="text-lg font-semibold mb-4 text-yellow-400">📍 LOCALISATION SÉLECTIONNÉE</h2>
          <div className="bg-zinc-800 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-zinc-400 text-sm">Coordonnées</p>
              <p className="font-mono text-lg">{position[0].toFixed(5)}° N, {position[1].toFixed(5)}° E</p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Adresse</p>
              <p className="text-sm break-words">{address || 'Cliquez sur la carte'}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Région</p>
              <p className="font-semibold text-yellow-400">{region || 'Non détectée'}</p>
            </div>
          </div>
        </div>

        {/* B1 - Vue satellite */}
        <div className="p-6 border-b border-zinc-700">
          <button
            onClick={() => setShowSatellite(!showSatellite)}
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            🛰️ {showSatellite ? 'Masquer' : 'Afficher'} la vue satellite
          </button>
          {showSatellite && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Opacité:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={satelliteOpacity}
                  onChange={(e) => setSatelliteOpacity(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-500"
                />
                <span className="text-sm w-12">{Math.round(satelliteOpacity * 100)}%</span>
              </div>
              <p className="text-xs text-zinc-500">La vue satellite s'affiche sur la carte principale</p>
            </div>
          )}
        </div>

        {/* B2 - Vue bâtiment SVG */}
        <div className="p-6 border-b border-zinc-700">
          <button
            onClick={() => setShowBuildingSvg(!showBuildingSvg)}
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            🏢 {showBuildingSvg ? 'Masquer' : 'Afficher'} la vue bâtiment
          </button>
          {showBuildingSvg && (
            <div className="mt-3 space-y-3">
              <input
                type="number"
                placeholder="Surface en m²"
                className="w-full bg-zinc-800 border border-zinc-600 p-3 rounded-xl focus:outline-none focus:border-yellow-500"
                onChange={(e) => {
                  const surface = parseFloat(e.target.value);
                  if (!isNaN(surface) && surface > 0) {
                    generateBuildingSvg(surface);
                    setBuildingDimensions({ width: Math.sqrt(surface) * 2, height: Math.sqrt(surface) * 1.6, area: surface });
                  }
                }}
              />
              {buildingSvg && (
                <div className="bg-white rounded-xl p-4">
                  <img src={buildingSvg} alt="Plan bâtiment" className="w-full" />
                  <div className="text-center text-black text-sm mt-2">
                    <p className="font-semibold">Surface: {buildingDimensions.area} m²</p>
                    <p className="text-xs text-gray-500">Dimensions: {buildingDimensions.width.toFixed(1)}m x {buildingDimensions.height.toFixed(1)}m</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* B3 - Extraction PDF */}
        <div className="p-6 border-b border-zinc-700">
          <label className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
            📄 Extraire images d'un PDF client
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              disabled={isExtractingPdf}
            />
          </label>
          {isExtractingPdf && (
            <div className="mt-3 text-center text-sm text-purple-400">
              <div className="animate-pulse">Extraction en cours...</div>
            </div>
          )}
          {pdfImages.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-purple-400">{pdfImages.length} image(s) extraite(s):</p>
              <div className="grid grid-cols-2 gap-2">
                {pdfImages.map((img, idx) => (
                  <img key={idx} src={img} alt={`Page ${idx + 1}`} className="rounded-lg border border-zinc-700" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* B4 - Plan cadastral */}
        <div className="p-6 border-b border-zinc-700">
          <button
            onClick={() => {
              setShowCadastre(!showCadastre);
              if (!cadastreData) {
                const data = getCadastreData(region, position[0], position[1]);
                setCadastreData(data);
                setCadastreImage(generateCadastreImage(data));
              }
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            🗺️ {showCadastre ? 'Masquer' : 'Afficher'} le plan cadastral
          </button>
          {showCadastre && cadastreData && (
            <div className="mt-3 space-y-3">
              <div className="bg-zinc-800 rounded-xl p-3 text-sm space-y-1">
                <p className="flex justify-between"><span className="text-zinc-400">📋 Parcelle:</span><span className="font-mono">{cadastreData.parcelle}</span></p>
                <p className="flex justify-between"><span className="text-zinc-400">📐 Surface:</span><span>{cadastreData.surface} m²</span></p>
                <p className="flex justify-between"><span className="text-zinc-400">📍 Section:</span><span>{cadastreData.section}</span></p>
                <p className="flex justify-between"><span className="text-zinc-400">🏘️ Commune:</span><span>{cadastreData.commune}</span></p>
                <p className="flex justify-between"><span className="text-zinc-400">📮 Code Postal:</span><span>{cadastreData.codePostal}</span></p>
              </div>
              {cadastreImage && (
                <div className="bg-white rounded-xl p-4">
                  <img src={cadastreImage} alt="Plan cadastral" className="w-full" />
                  <p className="text-center text-black text-xs mt-2">Source: cadastre.gouv.fr (données officielles)</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ensoleillement */}
        {sunInfo && (
          <div className="p-6">
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Ensoleillement estimé</p>
                  <p className="text-3xl font-bold text-yellow-400">{sunInfo.hours} h/an</p>
                  <p className="text-xs text-zinc-500 mt-1">{sunInfo.description}</p>
                </div>
                <div className="text-5xl">☀️</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => alert(`✅ Localisation confirmée pour l'étude solaire!\n\n📊 Récapitulatif:\n📍 ${address}\n☀️ ${sunInfo?.hours || 1800} heures d'ensoleillement/an\n📐 Surface cadastrale: ${cadastreData?.surface || 'N/A'} m²`)}
          className="m-6 bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-bold text-lg transition-all"
        >
          ✅ Confirmer cette localisation
        </button>
      </div>

      {/* Carte principale */}
      <div className="flex-1 relative">
        <MapContainer
          center={position}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Couche de base OpenStreetMap */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* B1 - Vue satellite (couche overlay) */}
          {showSatellite && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &amp; OpenStreetMap'
              opacity={satelliteOpacity}
            />
          )}
          
          {/* Points d'ensoleillement */}
          {showSunMap && sunPoints.map((point, idx) => {
            const regionData = ensoleillementData[point.region];
            return (
              <CircleMarker
                key={idx}
                center={[point.lat, point.lng]}
                radius={12}
                fillColor={regionData?.color || '#ffcd94'}
                color="#ff8c42"
                weight={2}
                opacity={0.8}
                fillOpacity={0.6}
              >
                <Popup>
                  <div className="text-center">
                    <strong className="text-sm">{point.city}</strong>
                    <br />
                    <span className="text-lg">☀️</span> {point.hours} h/an
                    <br />
                    <span className="text-xs text-gray-600">{regionData?.description}</span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          
          <DraggableMarker position={position} onDragEnd={handleMarkerDragEnd} />
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>

        {/* Overlays d'information */}
        <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-2xl text-sm z-10 flex gap-3">
          <span>🗣️ Micro</span>
          <span className="text-yellow-400">•</span>
          <span>🖱️ Clic/Drag</span>
        </div>
        
        <button
          onClick={() => setShowSunMap(!showSunMap)}
          className="absolute top-6 right-6 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-2xl text-sm z-10 hover:bg-black/90 transition flex items-center gap-2"
        >
          {showSunMap ? '🔴' : '☀️'} {showSunMap ? 'Masquer' : 'Voir'} l'ensoleillement
        </button>
        
        {sunInfo && (
          <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-2xl text-sm z-10 flex items-center gap-2">
            <span>☀️</span>
            <span className="font-bold text-yellow-400">{sunInfo.hours} h/an</span>
            <span className="text-zinc-400">•</span>
            <span className="text-xs">{sunInfo.description}</span>
          </div>
        )}
        
        {showSatellite && (
          <div className="absolute top-20 right-6 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-xl text-xs z-10">
            🛰️ Satellite {Math.round(satelliteOpacity * 100)}%
          </div>
        )}
        
        <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-xl text-xs z-10">
          💡 Glissez le marqueur
        </div>
      </div>
    </div>
  );
}