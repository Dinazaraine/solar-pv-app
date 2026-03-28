'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useMapEvents } from 'react-leaflet';

// Imports dynamiques (inchangés)
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

// Types pour les données d'ensoleillement
interface EnsoleillementData {
  hours: number;
  color: string;
  description: string;
}

interface SunPoint {
  lat: number;
  lng: number;
  city: string;
  hours: number;
  region: string;
}

interface SunInfo {
  hours: number;
  region: string;
  city: string;
  description: string;
}

// Données d'ensoleillement par région (heures/an)
const ensoleillementData: Record<string, EnsoleillementData> = {
  'Provence-Alpes-Côte d\'Azur': { hours: 2800, color: '#ff6b35', description: 'Très bon ensoleillement, idéal pour le solaire' },
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

// Points d'intérêt pour l'ensoleillement
const sunPoints: SunPoint[] = [
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

export default function MapGeolocation() {
  const [position, setPosition] = useState<[number, number]>([46.5, 2.5]);
  const [region, setRegion] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSunMap, setShowSunMap] = useState<boolean>(false);
  const [sunInfo, setSunInfo] = useState<SunInfo | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculer les heures d'ensoleillement basé sur les coordonnées
  const calculateSunHours = (lat: number, lng: number): SunInfo => {
    // Trouver la région la plus proche
    let closestPoint: SunPoint | null = null;
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

  // Mettre à jour les infos d'ensoleillement quand les coordonnées changent
  useEffect(() => {
    if (position[0] && position[1]) {
      const sunData = calculateSunHours(position[0], position[1]);
      setSunInfo(sunData);
    }
  }, [position]);

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    fixLeafletIcons();
    
    // Vérifier si le navigateur supporte la reconnaissance vocale
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
          // Recherche automatique après reconnaissance vocale
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
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.');
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

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reverse-geocode/?lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      setAddress(data.display_name || '');
      const addr = data.address || {};
      setRegion(addr.state || addr.region || addr.county || addr.city || 'Région non détectée');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery || searchInputRef.current?.value.trim();
    if (!searchTerm) return;

    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/geocode/?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();

      if (data?.length > 0) {
        const { lat, lon, display_name, address } = data[0];
        setPosition([parseFloat(lat), parseFloat(lon)]);
        setAddress(display_name || '');
        const addr = address || {};
        setRegion(addr.state || addr.region || addr.city || addr.county || 'Région non détectée');
      } else {
        alert('Aucun résultat trouvé');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
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
              <h1 className="text-2xl font-bold">Carte Productible PV</h1>
              <p className="text-zinc-400 text-sm">France - Données d'ensoleillement</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-zinc-700">
          <div className="flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher une ville (Paris, Marseille...) ou utilisez le micro 🎤"
              className="flex-1 bg-zinc-800 border border-zinc-600 p-4 rounded-2xl focus:outline-none focus:border-yellow-500"
              onKeyDown={handleKeyDown}
              onChange={(e) => setSearchQuery(e.target.value)}
              defaultValue={searchQuery}
            />
            <button
              onClick={startVoiceRecognition}
              disabled={isListening}
              className={`px-4 rounded-2xl transition-all duration-200 ${
                isListening 
                  ? 'bg-red-600 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title="Recherche vocale"
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="mt-3 w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-zinc-700 text-black font-semibold py-4 rounded-2xl transition-all duration-200"
          >
            {loading ? 'Recherche...' : '🔍 Rechercher'}
          </button>
          
          {isListening && (
            <div className="mt-3 text-center text-sm text-yellow-400 animate-pulse">
              🎙️ Écoute en cours... Parlez maintenant
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <h2 className="text-lg font-semibold mb-5 text-yellow-400">📍 LOCALISATION SÉLECTIONNÉE</h2>
          
          <div className="bg-zinc-800 rounded-3xl p-6 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm">Coordonnées</p>
              <p className="font-mono text-lg">
                {position[0].toFixed(5)}° N, {position[1].toFixed(5)}° E
              </p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Région / Ville</p>
              <p className="text-2xl font-semibold break-words">{region || 'Cliquez sur la carte'}</p>
            </div>

            {address && (
              <div>
                <p className="text-zinc-400 text-sm">Adresse</p>
                <p className="text-zinc-300 text-sm leading-relaxed">{address}</p>
              </div>
            )}
          </div>

          {/* Carte d'ensoleillement */}
          <div className="mt-6">
            <button
              onClick={() => setShowSunMap(!showSunMap)}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>☀️</span>
              {showSunMap ? 'Masquer la carte d\'ensoleillement' : 'Voir la carte d\'ensoleillement'}
            </button>

            {showSunMap && (
              <div className="mt-4 p-4 bg-zinc-800 rounded-2xl">
                <div className="h-64 rounded-lg overflow-hidden mb-4">
                  <MapContainer
                    center={[46.5, 2.5]}
                    zoom={6}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {/* Cercles colorés pour l'ensoleillement */}
                    {sunPoints.map((point, idx) => {
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
                              <strong>{point.city}</strong>
                              <br />
                              ☀️ {point.hours} heures/an
                              <br />
                              <span className="text-sm text-gray-600">
                                {regionData?.description}
                              </span>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                    {/* Marqueur de la position sélectionnée */}
                    <Marker position={position}>
                      <Popup>
                        <div className="text-center">
                          <strong>Votre emplacement</strong>
                          <br />
                          {sunInfo && (
                            <>
                              ☀️ {sunInfo.hours} heures/an
                              <br />
                              <span className="text-sm text-gray-600">
                                {sunInfo.description}
                              </span>
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>

                {/* Légende */}
                <div className="bg-zinc-900 p-3 rounded-lg mb-4">
                  <p className="text-sm font-semibold mb-2">Légende - Heures d'ensoleillement par an :</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff6b35' }}></div>
                      <span>2600-2800h (Excellent)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff8c42' }}></div>
                      <span>2400-2600h (Très bon)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ffa559' }}></div>
                      <span>2100-2400h (Bon)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ffcd94' }}></div>
                      <span>1800-2100h (Modéré)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ffe6c7' }}></div>
                      <span>1600-1800h (Limité)</span>
                    </div>
                  </div>
                </div>

                {/* Estimation de production solaire */}
                {sunInfo && (
                  <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 p-4 rounded-lg border border-yellow-700">
                    <p className="text-sm font-semibold text-yellow-400 mb-2">
                      📊 Estimation du potentiel solaire :
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Ensoleillement annuel :</span>
                        <span className="font-semibold text-yellow-400">{sunInfo.hours} heures</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Production estimée :</span>
                        <span className="font-semibold text-green-400">
                          {(0.15 * sunInfo.hours).toFixed(0)} kWh/kWc/an
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-300">Économies estimées :</span>
                        <span className="font-semibold text-green-400">
                          ~{Math.round(0.15 * sunInfo.hours * 0.2).toFixed(0)} €/kWc/an
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-300">CO₂ évité :</span>
                        <span className="font-semibold text-green-400">
                          ~{Math.round(0.15 * sunInfo.hours * 0.06).toFixed(0)} kg CO₂/kWc/an
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-3">
                      * Estimation basée sur une installation photovoltaïque standard (1 kWc produit ~{Math.round(0.15 * sunInfo.hours)} kWh/an)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Résumé rapide de l'ensoleillement */}
            {sunInfo && !showSunMap && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl border border-yellow-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Ensoleillement à votre emplacement :</p>
                    <p className="text-2xl font-bold text-yellow-400">{sunInfo.hours} heures/an</p>
                    <p className="text-xs text-zinc-500 mt-1">{sunInfo.description}</p>
                  </div>
                  <div className="text-4xl">☀️</div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => alert('✅ Localisation envoyée pour le calcul PV !\n\n📊 Données d\'ensoleillement : ' + (sunInfo ? sunInfo.hours + ' heures/an' : 'calcul en cours'))}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 py-5 rounded-3xl text-xl font-bold transition-all duration-200"
          >
            ✅ Confirmer cette localisation
          </button>
        </div>
      </div>

      {/* Carte principale */}
      <div className="flex-1 relative">
        <MapContainer
          center={position}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={position} draggable>
            <Popup>
              <div className="text-center">
                <strong>Position sélectionnée</strong>
                <br />
                {sunInfo && (
                  <>
                    ☀️ {sunInfo.hours} heures/an
                    <br />
                    <span className="text-sm">{sunInfo.description}</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>

        <div className="absolute top-6 left-6 bg-black/70 px-5 py-3 rounded-2xl text-sm z-10 backdrop-blur-sm">
          🗣️ Cliquez sur le micro 🎤 pour une recherche vocale
        </div>
        
        {sunInfo && (
          <div className="absolute bottom-6 left-6 bg-black/70 px-4 py-2 rounded-2xl text-sm z-10 backdrop-blur-sm flex items-center gap-2">
            <span>☀️</span>
            <span>{sunInfo.hours} heures/an</span>
            <span className="text-yellow-400">•</span>
            <span>{sunInfo.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}