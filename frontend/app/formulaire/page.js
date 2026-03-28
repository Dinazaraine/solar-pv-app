// app/formulaire/page.js - Version corrigée
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, CheckCircle, ChevronRight, ChevronLeft, MapPin, X, Volume2, VolumeX, AlertCircle, Sun, Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useMapEvents } from 'react-leaflet';

// Imports dynamiques pour la carte
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
  delete (L.Icon.Default.prototype)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function MapClickHandler({ onClick }) {
  useMapEvents({ click: onClick });
  return null;
}

// Types pour les données d'ensoleillement
const ensoleillementData = {
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

export default function FormulaireVocal() {
  const [step, setStep] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentField, setCurrentField] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showSunMap, setShowSunMap] = useState(false);
  const [mapPosition, setMapPosition] = useState([46.5, 2.5]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [microphoneError, setMicrophoneError] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Prêt');
  const [sunInfo, setSunInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    societe: '',
    adresse: '',
    adresseDetails: '',
    coordonnees: { lat: null, lng: null },
    typeBatiment: '',
    surfaceToiture: '',
    contactNom: '',
    contactEmail: '',
    contactTelephone: '',
    consommationMensuelle: '',
    factureMoyenne: '',
    puissanceSouscrite: '',
    equipementsActuels: '',
    equipementsSouhaites: '',
    priorite: '',
    objectifPrincipal: '',
    budget: '',
    echeance: ''
  });

  const recognitionRef = useRef(null);
  const currentFieldRef = useRef('');
  const stepRef = useRef(1);
  const listeningTimeoutRef = useRef(null);

  const steps = {
    1: {
      title: "Identification & Site",
      fields: [
        { name: 'prenom', label: 'Prénom', type: 'text', required: true, question: "Quel est votre prénom ?" },
        { name: 'nom', label: 'Nom', type: 'text', required: true, question: "Quel est votre nom de famille ?" },
        { name: 'email', label: 'Email', type: 'email', required: true, question: "Quelle est votre adresse email ?" },
        { name: 'telephone', label: 'Téléphone', type: 'tel', required: true, question: "Quel est votre numéro de téléphone ?" },
        { name: 'societe', label: 'Société (optionnel)', type: 'text', required: false, question: "Quel est le nom de votre société ?" },
        { name: 'adresse', label: 'Adresse du bâtiment', type: 'map', required: true, question: "Où se situe votre bâtiment ?" },
        { name: 'typeBatiment', label: 'Type de bâtiment', type: 'select', required: true, question: "Quel est le type de bâtiment ?", options: ['Maison individuelle', 'Immeuble', 'Bureau', 'Commerce', 'Industriel', 'Agricole'] },
        { name: 'surfaceToiture', label: 'Surface de toiture (m²)', type: 'number', required: true, question: "Quelle est la surface de toiture en mètres carrés ?" }
      ]
    },
    2: {
      title: "Contact",
      fields: [
        { name: 'contactNom', label: 'Nom du contact principal', type: 'text', required: true, question: "Quel est le nom du contact principal ?" },
        { name: 'contactEmail', label: 'Email du contact', type: 'email', required: true, question: "Quel est l'email du contact ?" },
        { name: 'contactTelephone', label: 'Téléphone du contact', type: 'tel', required: true, question: "Quel est le numéro de téléphone du contact ?" }
      ]
    },
    3: {
      title: "Consommation",
      fields: [
        { name: 'consommationMensuelle', label: 'Consommation mensuelle (kWh)', type: 'number', required: true, question: "Quelle est votre consommation électrique mensuelle en kilowattheures ?" },
        { name: 'factureMoyenne', label: 'Facture moyenne (€)', type: 'number', required: true, question: "Quel est le montant moyen de votre facture d'électricité ?" },
        { name: 'puissanceSouscrite', label: 'Puissance souscrite (kVA)', type: 'number', required: true, question: "Quelle est la puissance souscrite en kilovoltampères ?" }
      ]
    },
    4: {
      title: "Équipements",
      fields: [
        { name: 'equipementsActuels', label: 'Équipements actuels', type: 'text', required: true, question: "Quels équipements solaires avez-vous actuellement ?" },
        { name: 'equipementsSouhaites', label: 'Équipements souhaités', type: 'text', required: true, question: "Quels équipements souhaitez-vous installer ?" },
        { name: 'priorite', label: 'Priorité', type: 'select', required: true, question: "Quelle est votre priorité ?", options: ['Économies', 'Autonomie', 'Ecologie', 'Revente'] }
      ]
    },
    5: {
      title: "Objectifs",
      fields: [
        { name: 'objectifPrincipal', label: 'Objectif principal', type: 'select', required: true, question: "Quel est votre objectif principal ?", options: ['Réduire la facture', 'Indépendance énergétique', 'Valoriser le bien', 'Écologie'] },
        { name: 'budget', label: 'Budget (€)', type: 'number', required: true, question: "Quel est votre budget pour ce projet ?" },
        { name: 'echeance', label: 'Échéance souhaitée', type: 'select', required: true, question: "Quand souhaitez-vous réaliser ce projet ?", options: ['Dans 3 mois', 'Dans 6 mois', 'Dans 1 an', 'Plus tard'] }
      ]
    }
  };

  // Calculer les heures d'ensoleillement
  const calculateSunHours = (lat, lng) => {
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

  // Mettre à jour les infos d'ensoleillement
  useEffect(() => {
    if (formData.coordonnees.lat && formData.coordonnees.lng) {
      const sunData = calculateSunHours(formData.coordonnees.lat, formData.coordonnees.lng);
      setSunInfo(sunData);
    }
  }, [formData.coordonnees]);

  // Mettre à jour les refs
  useEffect(() => {
    currentFieldRef.current = currentField;
  }, [currentField]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Fonction de synthèse vocale
  const speak = useCallback((text) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceEnabled]);

  // Demander la permission du microphone
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophoneError(false);
      setDebugInfo('Microphone autorisé');
      return true;
    } catch (err) {
      console.error('Erreur microphone:', err);
      setMicrophoneError(true);
      setDebugInfo('Erreur microphone: ' + err.message);
      return false;
    }
  };

  // Démarrer l'écoute avec timeout
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Reconnaissance vocale non disponible");
      return;
    }
    
    if (microphoneError) {
      requestMicrophonePermission();
      return;
    }
    
    try {
      recognitionRef.current.start();
      
      // Timeout automatique après 8 secondes
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      listeningTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.abort();
          setDebugInfo('Timeout - arrêt automatique');
        }
      }, 8000);
    } catch (e) {
      console.error('Erreur démarrage:', e);
    }
  }, [microphoneError, isListening]);

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    fixLeafletIcons();
    
    const initSpeechRecognition = async () => {
      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.lang = 'fr-FR';
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.maxAlternatives = 1;
          
          recognitionRef.current.onstart = () => {
            setIsListening(true);
            setTranscript('');
            setDebugInfo('Écoute en cours...');
          };
          
          recognitionRef.current.onresult = (event) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript;
            setTranscript(transcriptText);
            setDebugInfo(`Reconnu: "${transcriptText}"`);
            
            if (event.results[current].isFinal && transcriptText.trim()) {
              // Annuler le timeout
              if (listeningTimeoutRef.current) {
                clearTimeout(listeningTimeoutRef.current);
              }
              handleVoiceInput(transcriptText);
            }
          };
          
          recognitionRef.current.onerror = (event) => {
            console.log('Erreur reconnaissance:', event.error);
            
            if (event.error === 'not-allowed') {
              setMicrophoneError(true);
              speak("Veuillez autoriser l'accès au microphone");
              setDebugInfo('Microphone non autorisé');
            } else if (event.error === 'no-speech') {
              // Gestion silencieuse du no-speech
              setDebugInfo('Aucune parole détectée');
              // Ne pas parler, juste arrêter
            } else if (event.error === 'network') {
              speak("Problème de réseau, veuillez réessayer");
              setDebugInfo('Erreur réseau');
            } else {
              setDebugInfo(`Erreur: ${event.error}`);
            }
            
            if (listeningTimeoutRef.current) {
              clearTimeout(listeningTimeoutRef.current);
            }
            setIsListening(false);
          };
          
          recognitionRef.current.onend = () => {
            if (listeningTimeoutRef.current) {
              clearTimeout(listeningTimeoutRef.current);
            }
            setIsListening(false);
            setDebugInfo('Prêt');
          };
          
          setDebugInfo('Reconnaissance vocale initialisée');
          await requestMicrophonePermission();
        } else {
          alert("Votre navigateur ne supporte pas la reconnaissance vocale");
        }
      }
    };
    
    initSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
    };
  }, []);

  const handleVoiceInput = useCallback(async (transcriptText) => {
    const currentStepValue = stepRef.current;
    const currentFieldValue = currentFieldRef.current;
    
    const lowerText = transcriptText.toLowerCase().trim();
    
    if (!lowerText) {
      return;
    }
    
    if (currentFieldValue === 'adresse_recherche') {
      await geocode(transcriptText);
      setCurrentField('');
      currentFieldRef.current = '';
      return;
    }
    
    const currentStepFields = steps[currentStepValue].fields;
    const currentFieldObj = currentStepFields.find(f => f.name === currentFieldValue);
    
    if (currentFieldObj) {
      let value = transcriptText;
      
      if (currentFieldObj.type === 'number') {
        const numbers = transcriptText.match(/\d+/g);
        if (numbers) {
          value = numbers.join('');
        } else {
          speak("Je n'ai pas détecté de nombre. Cliquez sur le micro pour réessayer.");
          return;
        }
      }
      
      if (currentFieldObj.type === 'select' && currentFieldObj.options) {
        const matchedOption = currentFieldObj.options.find(opt => 
          lowerText.includes(opt.toLowerCase())
        );
        if (matchedOption) {
          value = matchedOption;
        } else {
          speak(`Options disponibles : ${currentFieldObj.options.join(', ')}`);
          return;
        }
      }
      
      setFormData(prev => ({ ...prev, [currentFieldValue]: value }));
      speak(`J'ai enregistré ${currentFieldObj.label} : ${value}`);
      
      const currentIndex = currentStepFields.findIndex(f => f.name === currentFieldValue);
      if (currentIndex < currentStepFields.length - 1) {
        const nextField = currentStepFields[currentIndex + 1];
        setCurrentField(nextField.name);
        currentFieldRef.current = nextField.name;
        setTimeout(() => {
          speak(nextField.question);
        }, 500);
      } else {
        speak(`Étape ${currentStepValue} terminée. Cliquez sur suivant pour continuer.`);
        setCurrentField('');
        currentFieldRef.current = '';
      }
    }
  }, [speak]);

  const startFieldInput = useCallback((fieldName) => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    setCurrentField(fieldName);
    currentFieldRef.current = fieldName;
    
    const field = steps[step].fields.find(f => f.name === fieldName);
    if (field) {
      setTimeout(() => {
        speak(field.question);
        setTimeout(() => startListening(), 1000);
      }, 300);
    }
  }, [step, speak, isListening]);

  // Reverse geocoding
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reverse-geocode/?lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const fullAddress = data.display_name || '';
        const addressParts = fullAddress.split(',');
        const mainAddress = addressParts[0] || '';
        
        setFormData(prev => ({
          ...prev,
          adresse: mainAddress,
          adresseDetails: fullAddress,
          coordonnees: { lat, lng }
        }));
        
        speak(`Adresse sélectionnée : ${mainAddress}`);
        return true;
      }
    } catch (err) {
      console.error('Erreur reverse geocoding:', err);
    }
    return false;
  }, [speak]);

  // Forward geocoding
  const geocode = useCallback(async (address) => {
    setIsGeocoding(true);
    setDebugInfo(`Recherche adresse: ${address}`);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/geocode/?q=${encodeURIComponent(address)}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setMapPosition([parseFloat(lat), parseFloat(lon)]);
        setFormData(prev => ({
          ...prev,
          adresse: display_name.split(',')[0],
          adresseDetails: display_name,
          coordonnees: { lat: parseFloat(lat), lng: parseFloat(lon) }
        }));
        setDebugInfo(`Adresse trouvée: ${display_name.split(',')[0]}`);
        speak(`Adresse trouvée : ${display_name.split(',')[0]}`);
        setShowMap(true);
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      } else {
        setDebugInfo('Adresse non trouvée');
        speak("Désolé, je n'ai pas trouvé cette adresse");
      }
    } catch (err) {
      console.error('Erreur geocoding:', err);
      speak("Erreur lors de la recherche");
    } finally {
      setIsGeocoding(false);
    }
    return null;
  }, [speak]);

  const handleMapClick = useCallback(async (e) => {
    const { lat, lng } = e.latlng;
    setMapPosition([lat, lng]);
    await reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const searchAddressByVoice = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setCurrentField('adresse_recherche');
    currentFieldRef.current = 'adresse_recherche';
    setTimeout(() => {
      speak("Dites l'adresse que vous recherchez");
      setTimeout(() => startListening(), 1000);
    }, 300);
  }, [speak, isListening]);

  const isStepComplete = () => {
    const currentFields = steps[step].fields;
    return currentFields.every(field => {
      if (!field.required) return true;
      if (field.name === 'adresse') {
        return formData.adresse && formData.adresse.trim() !== '';
      }
      return formData[field.name] && formData[field.name].trim() !== '';
    });
  };

  const nextStep = () => {
    if (isStepComplete() && step < 5) {
      setStep(step + 1);
      setCurrentField('');
      currentFieldRef.current = '';
      speak(`Passons à l'étape ${step + 1} : ${steps[step + 1].title}`);
    } else if (step === 5 && isStepComplete()) {
      speak("Félicitations ! Votre formulaire est complet.");
      alert("Formulaire soumis avec succès !");
      console.log("Données:", formData);
    } else {
      speak("Veuillez remplir tous les champs requis avant de continuer.");
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setCurrentField('');
      currentFieldRef.current = '';
    }
  };

  // Composant SunMap (simplifié pour éviter les doublons)
  const SunMap = () => (
    <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sun className="text-yellow-500" size={24} />
          <h4 className="font-semibold text-gray-800">Carte d'ensoleillement en France</h4>
        </div>
        <button
          onClick={() => setShowSunMap(!showSunMap)}
          className="text-blue-500 hover:text-blue-600 text-sm"
        >
          {showSunMap ? 'Masquer' : 'Voir la carte'}
        </button>
      </div>
      
      {showSunMap && (
        <div className="space-y-4">
          <div className="relative h-80 rounded-lg overflow-hidden border-2 border-yellow-200">
            <MapContainer
              center={[46.5, 2.5]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
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
              {formData.coordonnees.lat && formData.coordonnees.lng && (
                <Marker position={[formData.coordonnees.lat, formData.coordonnees.lng]}>
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
              )}
            </MapContainer>
          </div>
          
          {/* Légende et estimation... (garder le reste) */}
        </div>
      )}
      
      {sunInfo && !showSunMap && (
        <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ensoleillement à votre emplacement :</p>
              <p className="text-lg font-bold text-orange-600">{sunInfo.hours} heures/an</p>
              <p className="text-xs text-gray-500">{sunInfo.description}</p>
            </div>
            <Sun className="text-yellow-500" size={32} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">SolairePro</h1>
          <p className="text-gray-600">Formulaire vocal - Parlez, on s'occupe du reste !</p>
          
          <div className="mt-4 p-2 bg-gray-800 text-white text-xs rounded-lg font-mono">
            🐛 Debug: {debugInfo} | Champ actif: {currentField || 'aucun'}
          </div>
          
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-200 rounded-full text-sm hover:bg-gray-300 transition-colors"
            >
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {voiceEnabled ? "Audio actif" : "Audio coupé"}
            </button>
            <button
              onClick={() => setShowSunMap(!showSunMap)}
              className="flex items-center gap-2 px-3 py-1 bg-yellow-200 rounded-full text-sm hover:bg-yellow-300 transition-colors"
            >
              <Sun size={16} />
              Carte ensoleillement
            </button>
            {microphoneError && (
              <button
                onClick={requestMicrophonePermission}
                className="flex items-center gap-2 px-3 py-1 bg-orange-200 rounded-full text-sm hover:bg-orange-300 transition-colors"
              >
                <AlertCircle size={16} />
                Réactiver le micro
              </button>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5].map(num => (
              <div key={num} className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= num ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step > num ? <CheckCircle size={20} /> : num}
                </div>
                <div className="text-xs mt-1 text-gray-600">Étape {num}</div>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div 
              className="bg-yellow-500 rounded-full h-2 transition-all duration-500"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              ÉTAPE {step} / 5
            </h2>
            <h3 className="text-xl text-gray-600 mt-2">{steps[step].title}</h3>
          </div>

          <div className="mb-8 flex justify-center">
            <button
              onClick={() => {
                if (isListening) {
                  if (recognitionRef.current) recognitionRef.current.abort();
                } else {
                  if (currentField) {
                    startListening();
                  } else {
                    speak("Veuillez d'abord sélectionner un champ avec le micro à côté");
                  }
                }
              }}
              className={`p-6 rounded-full transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 animate-pulse scale-110' 
                  : 'bg-yellow-500 hover:bg-yellow-600 hover:scale-105'
              }`}
            >
              {isListening ? <MicOff size={40} color="white" /> : <Mic size={40} color="white" />}
            </button>
            {isListening && (
              <div className="absolute mt-20 text-center">
                <p className="text-red-500 font-semibold animate-pulse">
                  🎙️ Écoute en cours... {transcript && `"${transcript}"`}
                </p>
                <p className="text-gray-500 text-xs mt-1">Parlez maintenant (8 secondes max)</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {steps[step].fields.map((field) => (
              <div key={field.name} className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name]}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">Sélectionnez...</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'map' ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.adresse}
                        onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                        placeholder="Adresse du bâtiment"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                      <button
                        onClick={searchAddressByVoice}
                        disabled={isGeocoding || isListening}
                        className="px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                        title="Rechercher une adresse par la voix"
                      >
                        {isGeocoding ? '⏳' : '🎤'}
                      </button>
                      <button
                        onClick={() => setShowMap(!showMap)}
                        className="px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        title="Ouvrir la carte"
                      >
                        <MapPin size={20} />
                      </button>
                    </div>
                    
                    {formData.coordonnees.lat && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        📍 Coordonnées : {formData.coordonnees.lat.toFixed(6)}°, {formData.coordonnees.lng.toFixed(6)}°
                      </div>
                    )}
                    
                    {showMap && (
                      <div className="relative">
                        <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200">
                          <MapContainer
                            center={mapPosition}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; OpenStreetMap contributors'
                            />
                            {formData.coordonnees.lat && (
                              <Marker position={[formData.coordonnees.lat, formData.coordonnees.lng]}>
                                <Popup>
                                  {formData.adresse || 'Votre bâtiment'}
                                </Popup>
                              </Marker>
                            )}
                            <MapClickHandler onClick={handleMapClick} />
                          </MapContainer>
                        </div>
                        <button
                          onClick={() => setShowMap(false)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Cliquez sur la carte pour sélectionner l'emplacement exact
                        </div>
                      </div>
                    )}
                    
                    {formData.adresseDetails && !showMap && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formData.adresseDetails}
                      </div>
                    )}
                    
                    <SunMap />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type={field.type}
                      value={formData[field.name]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder={field.type === 'number' ? "ex: 150" : ""}
                    />
                    <button
                      onClick={() => startFieldInput(field.name)}
                      disabled={isListening}
                      className="px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                      title="Remplir avec la voix"
                    >
                      <Mic size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                step === 1 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              <ChevronLeft size={20} />
              Précédent
            </button>
            
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              {step === 5 ? 'Envoyer' : 'Suivant'}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Sans engagement - Données protégées (RGPD) © 2026 SolairePro</p>
        </div>
      </div>
    </div>
  );
}