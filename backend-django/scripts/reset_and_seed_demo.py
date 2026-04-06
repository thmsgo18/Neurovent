from __future__ import annotations

import os
import random
import sys
from datetime import timedelta
from html import escape
from pathlib import Path
from urllib.parse import urlparse

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.db import transaction
from django.utils import timezone

from events.models import (
    AddressVisibility,
    Event,
    EventFormat,
    EventStatus,
    OnlineVisibility,
    RegistrationMode,
)
from registrations.models import Registration, RegistrationStatus
from tags.models import Tag
from users.models import (
    CustomUser,
    ParticipantProfileType,
    UserRole,
    VerificationStatus,
)


PARTICIPANT_PASSWORD = "Participant2026!"
COMPANY_PASSWORD = "Company2026!"
ADMIN_PASSWORD = "Admin2026!"
BACKEND_BASE_URL = os.environ.get("DEMO_BACKEND_BASE_URL", "http://localhost:8000").rstrip("/")

MEDIA_ROOT = PROJECT_ROOT / "media"
AVATAR_DIR = MEDIA_ROOT / "avatars"
LOGO_DIR = MEDIA_ROOT / "logos"
BANNER_DIR = MEDIA_ROOT / "banners"

randomizer = random.Random(20260406)
now = timezone.now()


PARTICIPANT_BLUEPRINTS = [
    {
        "first_name": "Camille",
        "last_name": "Moreau",
        "email": "camille.moreau@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "Sorbonne Universite",
        "study_level": "Master 2 Neurosciences Cognitives",
        "employer_name": "Sorbonne Universite",
        "favorite_domain": "Cognitive Neuroscience",
        "bio": "Etudiante en neurosciences cognitives, Camille travaille sur les biomarqueurs comportementaux et aime comparer les protocoles d'evaluation entre laboratoires et startups.",
        "website": "https://camille-moreau.neurovent.demo",
        "github": "https://github.com/camillemoreau-demo",
        "linkedin": "https://www.linkedin.com/in/camille-moreau-demo",
        "tag_names": ["Neuroscience", "Cognitive Neuroscience", "Research Methods", "Scientific Reproducibility"],
        "joined_days_ago": 72,
        "color": ("#5E60CE", "#4EA8DE"),
        "active": True,
    },
    {
        "first_name": "Idriss",
        "last_name": "Benali",
        "email": "idriss.benali@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "CentraleSupelec",
        "study_level": "Ingenieur Biomediacal et IA",
        "employer_name": "CentraleSupelec",
        "favorite_domain": "Brain-Computer Interfaces",
        "bio": "Idriss explore les interfaces cerveau-machine appliquees aux environnements de rehabilitation et prototye des pipelines EEG temps reel pour des hackathons cliniques.",
        "website": "https://idriss-benali.neurovent.demo",
        "github": "https://github.com/idrissbenali-demo",
        "linkedin": "https://www.linkedin.com/in/idriss-benali-demo",
        "tag_names": ["Brain-Computer Interfaces", "Neural Engineering", "Signal Processing", "Biomedical Engineering"],
        "joined_days_ago": 61,
        "color": ("#1B4965", "#62B6CB"),
        "active": True,
    },
    {
        "first_name": "Clara",
        "last_name": "Garnier",
        "email": "clara.garnier@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "ENS Paris-Saclay",
        "study_level": "Doctorante en IA pour la sante",
        "employer_name": "ENS Paris-Saclay",
        "favorite_domain": "Trustworthy AI",
        "bio": "Clara prepare une these sur la fiabilite des modeles cliniques, avec un fort interet pour les analyses de drift et les strategies d'explicabilite en sante.",
        "website": "https://clara-garnier.neurovent.demo",
        "github": "https://github.com/claragarnier-demo",
        "linkedin": "https://www.linkedin.com/in/clara-garnier-demo",
        "tag_names": ["Trustworthy AI", "Responsible AI", "Explainable AI", "Clinical Research"],
        "joined_days_ago": 40,
        "color": ("#6C584C", "#DDBEA9"),
        "active": True,
    },
    {
        "first_name": "Theo",
        "last_name": "Renard",
        "email": "theo.renard@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "Universite Grenoble Alpes",
        "study_level": "Master 2 Imagerie Biomedicale",
        "employer_name": "Universite Grenoble Alpes",
        "favorite_domain": "Medical Imaging",
        "bio": "Theo croise IRM, segmentation 3D et visualisation scientifique. Il participe souvent a des evenements ou l'on compare les workflows d'annotation et de QA.",
        "website": "https://theo-renard.neurovent.demo",
        "github": "https://github.com/theorenard-demo",
        "linkedin": "https://www.linkedin.com/in/theo-renard-demo",
        "tag_names": ["Medical Imaging", "Neuroimaging", "Computer Vision", "Data Science"],
        "joined_days_ago": 28,
        "color": ("#003049", "#669BBC"),
        "active": True,
    },
    {
        "first_name": "Manon",
        "last_name": "Lefort",
        "email": "manon.lefort@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "Universite de Lille",
        "study_level": "Master 1 Psychologie Cognitive",
        "employer_name": "Universite de Lille",
        "favorite_domain": "Psychology",
        "bio": "Manon aime les formats atelier qui melangent recherche comportementale, tests utilisateurs et analyses quantitatives simples a reproduire dans un memoire.",
        "website": "https://manon-lefort.neurovent.demo",
        "github": "https://github.com/manonlefort-demo",
        "linkedin": "https://www.linkedin.com/in/manon-lefort-demo",
        "tag_names": ["Psychology", "Behavioral Science", "Cognitive Science", "Open Science"],
        "joined_days_ago": 19,
        "color": ("#9A031E", "#E36414"),
        "active": True,
    },
    {
        "first_name": "Yassine",
        "last_name": "El Idrissi",
        "email": "yassine.elidrissi@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "Universite de Bordeaux",
        "study_level": "Master 2 Data Science en Sante",
        "employer_name": "Universite de Bordeaux",
        "favorite_domain": "Digital Health",
        "bio": "Yassine travaille sur la qualite des donnees issues de parcours de soins numeriques et cherche des formats concrets pour echanger sur l'evaluation produit.",
        "website": "https://yassine-elidrissi.neurovent.demo",
        "github": "https://github.com/yassineelidrissi-demo",
        "linkedin": "https://www.linkedin.com/in/yassine-elidrissi-demo",
        "tag_names": ["Digital Health", "Health Informatics", "Data Governance", "Statistics"],
        "joined_days_ago": 11,
        "color": ("#2A9D8F", "#8AB17D"),
        "active": False,
    },
    {
        "first_name": "Pauline",
        "last_name": "Chevalier",
        "email": "pauline.chevalier@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "Aix-Marseille Universite",
        "study_level": "Doctorante en Sante Numerique",
        "employer_name": "Aix-Marseille Universite",
        "favorite_domain": "Public Health",
        "bio": "Pauline s'interesse aux cohortes numeriques et a l'usage de tableaux de bord data dans les projets multi-sites. Elle apprecie les evenements hybrides pour multiplier les retours terrain.",
        "website": "https://pauline-chevalier.neurovent.demo",
        "github": "https://github.com/paulinechevalier-demo",
        "linkedin": "https://www.linkedin.com/in/pauline-chevalier-demo",
        "tag_names": ["Public Health", "Epidemiology", "Digital Health", "Clinical Research"],
        "joined_days_ago": 7,
        "color": ("#3D405B", "#81B29A"),
        "active": True,
    },
    {
        "first_name": "Nolan",
        "last_name": "Faure",
        "email": "nolan.faure@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "INSA Lyon",
        "study_level": "Ingenieur en Sciences des Donnees",
        "employer_name": "INSA Lyon",
        "favorite_domain": "Machine Learning",
        "bio": "Nolan teste des pipelines MLOps simples pour des projets de sante et vient surtout aux meetups orientes architecture, evaluation et bonnes pratiques de collaboration.",
        "website": "https://nolan-faure.neurovent.demo",
        "github": "https://github.com/nolanfaure-demo",
        "linkedin": "https://www.linkedin.com/in/nolan-faure-demo",
        "tag_names": ["Machine Learning", "Deep Learning", "Data Science", "Optimization"],
        "joined_days_ago": 54,
        "color": ("#335C67", "#9E2A2B"),
        "active": True,
    },
    {
        "first_name": "Sarah",
        "last_name": "Benhamou",
        "email": "sarah.benhamou@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "Universite de Strasbourg",
        "study_level": "Master 2 Neurotechnologies",
        "employer_name": "Universite de Strasbourg",
        "favorite_domain": "Neurotechnology",
        "bio": "Sarah travaille sur des dispositifs de suivi neurophysiologique et recherche des evenements tres operationnels pour comparer capteurs, protocoles et retours d'usage.",
        "website": "https://sarah-benhamou.neurovent.demo",
        "github": "https://github.com/sarahbenhamou-demo",
        "linkedin": "https://www.linkedin.com/in/sarah-benhamou-demo",
        "tag_names": ["Neurotechnology", "Wearable Sensors", "Assistive Technologies", "Signal Processing"],
        "joined_days_ago": 96,
        "color": ("#7B2CBF", "#C77DFF"),
        "active": True,
    },
    {
        "first_name": "Mathis",
        "last_name": "Caron",
        "email": "mathis.caron@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.STUDENT,
        "school_name": "IMT Atlantique",
        "study_level": "Mastere IA et Cybersecurite",
        "employer_name": "IMT Atlantique",
        "favorite_domain": "Privacy",
        "bio": "Mathis combine IA appliquee, cybersecurite et enjeux de confidentialite. Il aime les bootcamps ou l'on peut comparer architecture, gouvernance et exigences de conformite.",
        "website": "https://mathis-caron.neurovent.demo",
        "github": "https://github.com/mathiscaron-demo",
        "linkedin": "https://www.linkedin.com/in/mathis-caron-demo",
        "tag_names": ["Privacy", "Differential Privacy", "Cybersecurity", "Federated Learning"],
        "joined_days_ago": 84,
        "color": ("#283618", "#606C38"),
        "active": False,
    },
    {
        "first_name": "Juliette",
        "last_name": "Perrin",
        "email": "juliette.perrin@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "BioSerenity",
        "job_title": "Clinical Data Scientist",
        "job_started_at": now.date() - timedelta(days=640),
        "employer_name": "BioSerenity",
        "favorite_domain": "Clinical Research",
        "bio": "Juliette coordonne des analyses cliniques autour des donnees EEG et adore les evenements qui permettent de comparer operations produit, qualite et preuve clinique.",
        "website": "https://juliette-perrin.neurovent.demo",
        "github": "https://github.com/julietteperrin-demo",
        "linkedin": "https://www.linkedin.com/in/juliette-perrin-demo",
        "tag_names": ["Clinical Research", "Signal Processing", "Digital Health", "Medical Imaging"],
        "joined_days_ago": 145,
        "color": ("#023047", "#219EBC"),
        "active": True,
    },
    {
        "first_name": "Antoine",
        "last_name": "Marchal",
        "email": "antoine.marchal@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Capgemini Engineering",
        "job_title": "AI Consultant for Healthcare",
        "job_started_at": now.date() - timedelta(days=810),
        "employer_name": "Capgemini Engineering",
        "favorite_domain": "Responsible AI",
        "bio": "Antoine accompagne des equipes produit et R&D sur des feuilles de route data/IA. Il cherche surtout des formats utiles pour transformer des retours terrain en priorites livrables.",
        "website": "https://antoine-marchal.neurovent.demo",
        "github": "https://github.com/antoinemarchal-demo",
        "linkedin": "https://www.linkedin.com/in/antoine-marchal-demo",
        "tag_names": ["Responsible AI", "Data Governance", "Innovation in Healthcare", "Machine Learning"],
        "joined_days_ago": 133,
        "color": ("#264653", "#2A9D8F"),
        "active": True,
    },
    {
        "first_name": "Sofia",
        "last_name": "Ait Kaci",
        "email": "sofia.aitkaci@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Doctolib",
        "job_title": "Product Manager Data Health",
        "job_started_at": now.date() - timedelta(days=540),
        "employer_name": "Doctolib",
        "favorite_domain": "Health Informatics",
        "bio": "Sofia est passionnee par l'experience clinique et la circulation de l'information de sante. Elle privilegie les tables rondes qui confrontent vision produit et contraintes operationnelles.",
        "website": "https://sofia-aitkaci.neurovent.demo",
        "github": "https://github.com/sofiaaitkaci-demo",
        "linkedin": "https://www.linkedin.com/in/sofia-aitkaci-demo",
        "tag_names": ["Health Informatics", "Digital Health", "Public Health", "Data Governance"],
        "joined_days_ago": 117,
        "color": ("#006D77", "#83C5BE"),
        "active": True,
    },
    {
        "first_name": "Maxime",
        "last_name": "Barre",
        "email": "maxime.barre@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Owkin",
        "job_title": "Machine Learning Engineer",
        "job_started_at": now.date() - timedelta(days=485),
        "employer_name": "Owkin",
        "favorite_domain": "Computational Neuroscience",
        "bio": "Maxime contribue a des projets de modelisation appliquee a la biologie et la recherche clinique. Il aime les evenements ou l'on parle datasets, benchmarks et passage a l'echelle.",
        "website": "https://maxime-barre.neurovent.demo",
        "github": "https://github.com/maximebarre-demo",
        "linkedin": "https://www.linkedin.com/in/maxime-barre-demo",
        "tag_names": ["Computational Neuroscience", "Machine Learning", "Bioinformatics", "Genomics"],
        "joined_days_ago": 103,
        "color": ("#1D3557", "#457B9D"),
        "active": True,
    },
    {
        "first_name": "Lea",
        "last_name": "Vasseur",
        "email": "lea.vasseur@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "NVIDIA",
        "job_title": "Solutions Architect Healthcare",
        "job_started_at": now.date() - timedelta(days=930),
        "employer_name": "NVIDIA",
        "favorite_domain": "Deep Learning",
        "bio": "Lea accompagne des equipes sur les performances d'entrainement et d'inference. Elle apprecie les workshops hands-on et les formats de comparaison d'architectures.",
        "website": "https://lea-vasseur.neurovent.demo",
        "github": "https://github.com/leavasseur-demo",
        "linkedin": "https://www.linkedin.com/in/lea-vasseur-demo",
        "tag_names": ["Deep Learning", "Computer Vision", "Machine Learning", "Optimization"],
        "joined_days_ago": 165,
        "color": ("#2B2D42", "#8D99AE"),
        "active": True,
    },
    {
        "first_name": "Mehdi",
        "last_name": "Roussel",
        "email": "mehdi.roussel@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Sanofi",
        "job_title": "Digital Biomarker Lead",
        "job_started_at": now.date() - timedelta(days=1210),
        "employer_name": "Sanofi",
        "favorite_domain": "Digital Health",
        "bio": "Mehdi structure des programmes de biomarqueurs numeriques et cherche des evenements qui croisent medecins, affaires reglementaires et equipes data.",
        "website": "https://mehdi-roussel.neurovent.demo",
        "github": "https://github.com/mehdiroussel-demo",
        "linkedin": "https://www.linkedin.com/in/mehdi-roussel-demo",
        "tag_names": ["Digital Health", "Clinical Research", "Medical Imaging", "Innovation in Healthcare"],
        "joined_days_ago": 202,
        "color": ("#9D0208", "#DC2F02"),
        "active": True,
    },
    {
        "first_name": "Claire",
        "last_name": "Pichon",
        "email": "claire.pichon@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Philips Healthcare",
        "job_title": "MRI Application Specialist",
        "job_started_at": now.date() - timedelta(days=1505),
        "employer_name": "Philips Healthcare",
        "favorite_domain": "Neuroimaging",
        "bio": "Claire adore les evenements ou les utilisateurs partagent des protocoles tres concrets, des retours site et des astuces pour rendre les outils plus utiles au quotidien.",
        "website": "https://claire-pichon.neurovent.demo",
        "github": "https://github.com/clairepichon-demo",
        "linkedin": "https://www.linkedin.com/in/claire-pichon-demo",
        "tag_names": ["Neuroimaging", "Medical Imaging", "Clinical Research", "Biomedical Engineering"],
        "joined_days_ago": 185,
        "color": ("#005F73", "#0A9396"),
        "active": True,
    },
    {
        "first_name": "Romain",
        "last_name": "Delmas",
        "email": "romain.delmas@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Hugging Face",
        "job_title": "Developer Relations Engineer",
        "job_started_at": now.date() - timedelta(days=470),
        "employer_name": "Hugging Face",
        "favorite_domain": "Open Science",
        "bio": "Romain aime les rencontres communautaires ou l'on partage jeux de donnees, retours d'integration et bonnes pratiques de publication ouvertes et reproductibles.",
        "website": "https://romain-delmas.neurovent.demo",
        "github": "https://github.com/romaindelmas-demo",
        "linkedin": "https://www.linkedin.com/in/romain-delmas-demo",
        "tag_names": ["Open Science", "Scientific Reproducibility", "Machine Learning", "Natural Language Processing"],
        "joined_days_ago": 79,
        "color": ("#F4A261", "#E76F51"),
        "active": True,
    },
    {
        "first_name": "Fatou",
        "last_name": "Ndiaye",
        "email": "fatou.ndiaye@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Alan",
        "job_title": "Data Product Manager",
        "job_started_at": now.date() - timedelta(days=615),
        "employer_name": "Alan",
        "favorite_domain": "Innovation in Healthcare",
        "bio": "Fatou structure des products data pour des experiences de sante plus simples. Elle privilegie les formats ou l'on parle impact utilisateur, priorisation et resultat concret.",
        "website": "https://fatou-ndiaye.neurovent.demo",
        "github": "https://github.com/fatoundiaye-demo",
        "linkedin": "https://www.linkedin.com/in/fatou-ndiaye-demo",
        "tag_names": ["Innovation in Healthcare", "Digital Health", "Data Science", "Human-Computer Interaction"],
        "joined_days_ago": 58,
        "color": ("#6A040F", "#9D0208"),
        "active": True,
    },
    {
        "first_name": "Hugo",
        "last_name": "Mercier",
        "email": "hugo.mercier@participants.neurovent.demo",
        "profile_type": ParticipantProfileType.PROFESSIONAL,
        "professional_company_name": "Mistral AI",
        "job_title": "Applied AI Engineer",
        "job_started_at": now.date() - timedelta(days=320),
        "employer_name": "Mistral AI",
        "favorite_domain": "Natural Language Processing",
        "bio": "Hugo aime transformer une demarcation technique en vrai produit. Les sessions ou des equipes partagent leurs arbitages de deploiement et leurs cas limites l'interessent tout particulierement.",
        "website": "https://hugo-mercier.neurovent.demo",
        "github": "https://github.com/hugomercier-demo",
        "linkedin": "https://www.linkedin.com/in/hugo-mercier-demo",
        "tag_names": ["Natural Language Processing", "Machine Learning", "Responsible AI", "Trustworthy AI"],
        "joined_days_ago": 22,
        "color": ("#22223B", "#4A4E69"),
        "active": True,
    },
]


COMPANY_BLUEPRINTS = [
    {
        "identifier": "mistral-ai",
        "company_name": "Mistral AI",
        "website": "https://mistral.ai",
        "focus": "foundation models and applied AI systems for enterprise and healthcare teams",
        "legal_representative": "Claire Joubert",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#F77F00", "#003049"),
        "tag_names": ["Machine Learning", "Natural Language Processing", "Responsible AI", "Trustworthy AI"],
    },
    {
        "identifier": "hugging-face",
        "company_name": "Hugging Face",
        "website": "https://huggingface.co",
        "focus": "open-source model collaboration, evaluation and community tooling",
        "legal_representative": "Romain Besson",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#F9C74F", "#F9844A"),
        "tag_names": ["Open Science", "Machine Learning", "Natural Language Processing", "Scientific Reproducibility"],
    },
    {
        "identifier": "owkin",
        "company_name": "Owkin",
        "website": "https://www.owkin.com",
        "focus": "AI for biopharma research, multimodal discovery and clinical collaboration",
        "legal_representative": "Maxence Perrier",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#124559", "#598392"),
        "tag_names": ["Machine Learning", "Clinical Research", "Bioinformatics", "Genomics"],
    },
    {
        "identifier": "doctolib",
        "company_name": "Doctolib",
        "website": "https://www.doctolib.fr",
        "focus": "digital health products, patient journeys and healthcare operations",
        "legal_representative": "Sofia Boulanger",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#0A7AFF", "#2EC4B6"),
        "tag_names": ["Digital Health", "Health Informatics", "Public Health", "Human-Computer Interaction"],
    },
    {
        "identifier": "alan",
        "company_name": "Alan",
        "website": "https://alan.com",
        "focus": "digital insurance, health experiences and prevention services",
        "legal_representative": "Fatou Ndao",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#1B9AAA", "#EF476F"),
        "tag_names": ["Innovation in Healthcare", "Digital Health", "Data Science", "Public Health"],
    },
    {
        "identifier": "sanofi",
        "company_name": "Sanofi",
        "website": "https://www.sanofi.com",
        "focus": "biopharma innovation, clinical research and digital biomarker programs",
        "legal_representative": "Mehdi Armand",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#7B2CBF", "#3C096C"),
        "tag_names": ["Clinical Research", "Digital Health", "Innovation in Healthcare", "Statistics"],
    },
    {
        "identifier": "bioserenity",
        "company_name": "BioSerenity",
        "website": "https://www.bioserenity.com",
        "focus": "connected diagnostics, EEG workflows and remote monitoring programs",
        "legal_representative": "Juliette Perrin",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#00A896", "#05668D"),
        "tag_names": ["Signal Processing", "Wearable Sensors", "Digital Health", "Neurotechnology"],
    },
    {
        "identifier": "dassault-systemes",
        "company_name": "Dassault Systemes",
        "website": "https://www.3ds.com",
        "focus": "simulation platforms, collaborative R&D environments and regulated digital twins",
        "legal_representative": "Lucie Monnier",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#00509D", "#70E000"),
        "tag_names": ["Data Science", "Innovation in Healthcare", "Scientific Reproducibility", "Optimization"],
    },
    {
        "identifier": "capgemini-engineering",
        "company_name": "Capgemini Engineering",
        "website": "https://www.capgemini.com",
        "focus": "engineering delivery for health, medical devices and regulated AI products",
        "legal_representative": "Antoine Marchal",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#2A9D8F", "#264653"),
        "tag_names": ["Machine Learning", "Responsible AI", "Data Governance", "Innovation in Healthcare"],
    },
    {
        "identifier": "sopra-steria",
        "company_name": "Sopra Steria",
        "website": "https://www.soprasteria.com",
        "focus": "digital transformation and public-sector innovation in healthcare",
        "legal_representative": "Marine Delcourt",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": False,
        "colors": ("#9A031E", "#5F0F40"),
        "tag_names": ["Digital Health", "Public Health", "Data Governance", "Cybersecurity"],
    },
    {
        "identifier": "orange-business",
        "company_name": "Orange Business",
        "website": "https://business.orange.com",
        "focus": "cloud, connectivity and secure data platforms for health ecosystems",
        "legal_representative": "Nora Bensaid",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#FF7A00", "#202020"),
        "tag_names": ["Cybersecurity", "Data Governance", "Digital Health", "Privacy"],
    },
    {
        "identifier": "aws-france",
        "company_name": "AWS France",
        "website": "https://aws.amazon.com",
        "focus": "cloud infrastructure, analytics and AI services for health and life sciences",
        "legal_representative": "Lea Coulon",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#232F3E", "#FF9900"),
        "tag_names": ["Machine Learning", "Data Science", "Data Governance", "Optimization"],
    },
    {
        "identifier": "google-cloud-france",
        "company_name": "Google Cloud France",
        "website": "https://cloud.google.com",
        "focus": "data, AI and healthcare interoperability platforms",
        "legal_representative": "Thomas Lagarde",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#4285F4", "#34A853"),
        "tag_names": ["Machine Learning", "Health Informatics", "Data Science", "Trustworthy AI"],
    },
    {
        "identifier": "microsoft-france",
        "company_name": "Microsoft France",
        "website": "https://www.microsoft.com/fr-fr",
        "focus": "enterprise AI, productivity and compliant cloud platforms for health teams",
        "legal_representative": "Aurelie Maret",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#0078D4", "#50E6FF"),
        "tag_names": ["Responsible AI", "Machine Learning", "Cybersecurity", "Data Governance"],
    },
    {
        "identifier": "nvidia",
        "company_name": "NVIDIA",
        "website": "https://www.nvidia.com",
        "focus": "accelerated computing for imaging, simulation and AI research",
        "legal_representative": "Lea Vasseur",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#76B900", "#1A1A1A"),
        "tag_names": ["Deep Learning", "Computer Vision", "Medical Imaging", "Optimization"],
    },
    {
        "identifier": "philips-healthcare",
        "company_name": "Philips Healthcare",
        "website": "https://www.philips.com/healthcare",
        "focus": "clinical imaging, monitoring and connected care programs",
        "legal_representative": "Claire Pichon",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#005EB8", "#41B6E6"),
        "tag_names": ["Medical Imaging", "Digital Health", "Clinical Research", "Biomedical Engineering"],
    },
    {
        "identifier": "siemens-healthineers",
        "company_name": "Siemens Healthineers",
        "website": "https://www.siemens-healthineers.com",
        "focus": "diagnostic systems, imaging and clinical workflow transformation",
        "legal_representative": "Bastien Rolland",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#00A0A0", "#003B5C"),
        "tag_names": ["Medical Imaging", "Clinical Research", "Innovation in Healthcare", "Signal Processing"],
    },
    {
        "identifier": "ge-healthcare",
        "company_name": "GE HealthCare",
        "website": "https://www.gehealthcare.com",
        "focus": "precision diagnostics, imaging and patient-monitoring platforms",
        "legal_representative": "Celine Gaudin",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#003B71", "#4CC9F0"),
        "tag_names": ["Medical Imaging", "Clinical Research", "Digital Health", "Data Science"],
    },
    {
        "identifier": "iqvia",
        "company_name": "IQVIA",
        "website": "https://www.iqvia.com",
        "focus": "clinical data, trial operations and evidence generation",
        "legal_representative": "Amelie Duchamp",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#662D91", "#00AEEF"),
        "tag_names": ["Clinical Research", "Statistics", "Public Health", "Data Science"],
    },
    {
        "identifier": "medtronic-france",
        "company_name": "Medtronic France",
        "website": "https://www.medtronic.com",
        "focus": "medical devices, neurostimulation and connected therapy services",
        "legal_representative": "Pierre Delage",
        "verification_status": VerificationStatus.VERIFIED,
        "review_note": "",
        "active": True,
        "colors": ("#0076A8", "#00B4D8"),
        "tag_names": ["Neurotechnology", "Assistive Technologies", "Biomedical Engineering", "Digital Health"],
    },
    {
        "identifier": "brainlab",
        "company_name": "Brainlab",
        "website": "https://www.brainlab.com",
        "focus": "medical software for surgery, imaging and clinical precision workflows",
        "legal_representative": "Sandra Kieffer",
        "verification_status": VerificationStatus.NEEDS_REVIEW,
        "review_note": "Le dossier est complet mais le justificatif de domiciliation ne correspond pas encore au nom de la filiale declaree.",
        "active": True,
        "colors": ("#005F73", "#94D2BD"),
        "tag_names": ["Medical Imaging", "Biomedical Engineering", "Innovation in Healthcare", "Computer Vision"],
    },
    {
        "identifier": "abbott",
        "company_name": "Abbott",
        "website": "https://www.abbott.com",
        "focus": "diagnostics, wearables and connected health programs",
        "legal_representative": "Marie Vauclin",
        "verification_status": VerificationStatus.NEEDS_REVIEW,
        "review_note": "Le SIRET a bien ete transmis mais le nom du representant legal doit etre confirme avant validation finale.",
        "active": True,
        "colors": ("#009639", "#003DA5"),
        "tag_names": ["Wearable Sensors", "Digital Health", "Clinical Research", "Public Health"],
    },
    {
        "identifier": "roche-diagnostics-france",
        "company_name": "Roche Diagnostics France",
        "website": "https://diagnostics.roche.com",
        "focus": "diagnostics, precision medicine and translational data partnerships",
        "legal_representative": "Helene Marchand",
        "verification_status": VerificationStatus.NEEDS_REVIEW,
        "review_note": "Le domaine web de contact et l'adresse societaire fournie ne pointent pas encore vers la meme entite juridique.",
        "active": True,
        "colors": ("#009FE3", "#005F99"),
        "tag_names": ["Clinical Research", "Genomics", "Bioinformatics", "Innovation in Healthcare"],
    },
    {
        "identifier": "novartis-france",
        "company_name": "Novartis France",
        "website": "https://www.novartis.com",
        "focus": "drug development, evidence generation and patient-centric innovation",
        "legal_representative": "Guillaume Marest",
        "verification_status": VerificationStatus.NEEDS_REVIEW,
        "review_note": "Le compte attend une validation manuelle car le KBIS joint ne precise pas encore l'unite organisatrice des evenements.",
        "active": True,
        "colors": ("#F7941E", "#046A9A"),
        "tag_names": ["Clinical Research", "Innovation in Healthcare", "Statistics", "Public Health"],
    },
    {
        "identifier": "cegedim-sante",
        "company_name": "Cegedim Sante",
        "website": "https://www.cegedim.fr",
        "focus": "software and data services for healthcare professionals",
        "legal_representative": "Julie Bonnard",
        "verification_status": VerificationStatus.NEEDS_REVIEW,
        "review_note": "Quelques informations de profil sont manquantes sur les reseaux sociaux de l'organisation, une verification humaine est requise.",
        "active": True,
        "colors": ("#8E44AD", "#2980B9"),
        "tag_names": ["Health Informatics", "Digital Health", "Data Governance", "Public Health"],
    },
    {
        "identifier": "qare",
        "company_name": "Qare",
        "website": "https://www.qare.fr",
        "focus": "telemedicine products and digital care pathways",
        "legal_representative": "Elodie Roux",
        "verification_status": VerificationStatus.PENDING,
        "review_note": "Verification automatique en cours sur les donnees societaires et le contact de recuperation.",
        "active": True,
        "colors": ("#4EA8DE", "#90E0EF"),
        "tag_names": ["Digital Health", "Public Health", "Human-Computer Interaction", "Innovation in Healthcare"],
    },
    {
        "identifier": "oracle-health",
        "company_name": "Oracle Health",
        "website": "https://www.oracle.com/health",
        "focus": "health platforms, interoperability and data operations",
        "legal_representative": "Vincent Leroux",
        "verification_status": VerificationStatus.PENDING,
        "review_note": "Le dossier est en attente d'une verification complementaire sur l'entite organisatrice europeenne.",
        "active": True,
        "colors": ("#C74634", "#312D2A"),
        "tag_names": ["Health Informatics", "Data Governance", "Digital Health", "Statistics"],
    },
    {
        "identifier": "ibm-france",
        "company_name": "IBM France",
        "website": "https://www.ibm.com/fr-fr",
        "focus": "enterprise AI, hybrid cloud and governance for regulated industries",
        "legal_representative": "Morgane Tissier",
        "verification_status": VerificationStatus.PENDING,
        "review_note": "La verification est en attente car le document de preuve de rattachement n'a pas encore ete charge.",
        "active": True,
        "colors": ("#0F62FE", "#001D6C"),
        "tag_names": ["Responsible AI", "Data Governance", "Cybersecurity", "Machine Learning"],
    },
    {
        "identifier": "deepmind-france",
        "company_name": "DeepMind France",
        "website": "https://deepmind.google",
        "focus": "advanced AI research, scientific discovery and health-related experimentation",
        "legal_representative": "Yanis Renaud",
        "verification_status": VerificationStatus.REJECTED,
        "review_note": "Compte rejete: l'entite legale declaree ne correspond pas au justificatif fourni pour l'organisation d'evenements en France.",
        "active": True,
        "colors": ("#0057B8", "#7FBA00"),
        "tag_names": ["Machine Learning", "Responsible AI", "Scientific Reproducibility", "Neuroscience"],
    },
    {
        "identifier": "criteo-ai-lab",
        "company_name": "Criteo AI Lab",
        "website": "https://www.criteo.com",
        "focus": "applied machine learning, experimentation and large-scale data systems",
        "legal_representative": "Nina Rochefort",
        "verification_status": VerificationStatus.REJECTED,
        "review_note": "Compte rejete: le dossier de validation ne contient pas encore les informations societaires minimales pour les evenements partenaires.",
        "active": False,
        "colors": ("#FF5A5F", "#7B2D26"),
        "tag_names": ["Machine Learning", "Data Science", "Optimization", "Statistics"],
    },
]


EVENT_THEME_BLUEPRINTS = [
    {
        "series": "Applied Summit",
        "focus": "Clinical AI Validation",
        "description_focus": "des retours d'experience sur la validation clinique, les jeux de donnees, les protocoles d'evaluation et les indicateurs suivis avant de passer a l'echelle",
        "audience": "responsables innovation, equipes data, medecins referents et operations cliniques",
        "deliverable": "une grille de lecture partagee pour comparer preuves, risques et pre-requis de deploiement",
        "tag_names": ["Clinical Research", "Responsible AI", "Trustworthy AI", "Data Governance"],
    },
    {
        "series": "Workshop",
        "focus": "Digital Biomarkers",
        "description_focus": "des cas concrets autour des biomarqueurs numeriques, du suivi longitudinal et de l'integration produit dans des parcours patients",
        "audience": "equipes produit, R&D, affaires medicales et operations",
        "deliverable": "une base commune de bonnes pratiques pour instrumenter et interpreter les signaux",
        "tag_names": ["Digital Health", "Signal Processing", "Clinical Research", "Statistics"],
    },
    {
        "series": "Forum",
        "focus": "Neuroimaging Operations",
        "description_focus": "les arbitrages entre acquisition, annotation, QA et priorisation des usages cliniques et recherche",
        "audience": "specialistes IRM, medecins, chefs de projet et data scientists",
        "deliverable": "une feuille de route simple pour fluidifier les operations entre terrain et equipes IA",
        "tag_names": ["Neuroimaging", "Medical Imaging", "Computer Vision", "Clinical Research"],
    },
    {
        "series": "Roundtable",
        "focus": "Responsible AI for Health",
        "description_focus": "les enjeux d'explicabilite, de supervision et de gouvernance pour des systemes utilises dans des contextes sensibles",
        "audience": "leaders IA, responsables conformite, chercheurs et partenaires metier",
        "deliverable": "des criteres de decision pour prioriser fiabilite, transparence et adoption",
        "tag_names": ["Responsible AI", "Trustworthy AI", "Explainable AI", "Data Governance"],
    },
    {
        "series": "Bootcamp",
        "focus": "Research Data Quality",
        "description_focus": "la qualite de donnees, la reproductibilite et les contrats de schema utiles aux projets multi-equipes",
        "audience": "data engineers, analysts, ops de recherche et responsables plateforme",
        "deliverable": "une checklist actionnable pour industrialiser la collecte et l'analyse",
        "tag_names": ["Data Science", "Scientific Reproducibility", "Open Science", "Research Methods"],
    },
    {
        "series": "Meetup",
        "focus": "Brain-Computer Interfaces",
        "description_focus": "les prototypes BCI, les retours d'usage et la coordination entre capteurs, software et evaluation utilisateur",
        "audience": "ingenieurs, chercheurs, designers et startups neurotech",
        "deliverable": "des reperes concrets pour cadrer un pilote et mesurer sa valeur",
        "tag_names": ["Brain-Computer Interfaces", "Neural Engineering", "Signal Processing", "Assistive Technologies"],
    },
    {
        "series": "Leadership Briefing",
        "focus": "Health Data Governance",
        "description_focus": "les politiques d'acces, l'alignement juridique, les responsabilites et la mise en qualite de la donnee",
        "audience": "dirigeants, DPO, responsables plateforme et operations data",
        "deliverable": "un cadre clair pour arbitrer vitesse, securite et qualite de donnees",
        "tag_names": ["Data Governance", "Privacy", "Cybersecurity", "Health Informatics"],
    },
    {
        "series": "Lab Day",
        "focus": "Open Science Collaboration",
        "description_focus": "les flux de publication, la collaboration inter-organisation et les standards minimums de partage",
        "audience": "communautes open source, labs, startups et partenaires industriels",
        "deliverable": "une bibliotheque de pratiques reproductibles faciles a reprendre en equipe",
        "tag_names": ["Open Science", "Scientific Reproducibility", "Machine Learning", "Research Methods"],
    },
    {
        "series": "Exchange",
        "focus": "Federated Learning in Practice",
        "description_focus": "les patterns federes utiles en sante, les compromis techniques et les attentes des equipes securite",
        "audience": "architectes data, equipes IA et responsables de partenariats",
        "deliverable": "des patterns de mise en oeuvre et des points de vigilance tres concrets",
        "tag_names": ["Federated Learning", "Privacy", "Machine Learning", "Cybersecurity"],
    },
    {
        "series": "Session",
        "focus": "Human-Centered Care Products",
        "description_focus": "la qualite percue par les utilisateurs, l'experience clinician-first et l'equilibre entre innovation et adoption",
        "audience": "product managers, designers, operations et partenaires sante",
        "deliverable": "une synthese operationnelle pour mieux prioriser l'experience et l'impact",
        "tag_names": ["Human-Computer Interaction", "Digital Health", "Innovation in Healthcare", "Behavioral Science"],
    },
]


SCENARIO_SEQUENCE = (
    ["upcoming_auto_full"] * 6
    + ["upcoming_auto_open"] * 5
    + ["upcoming_validation_queue"] * 5
    + ["upcoming_closed_deadline"] * 4
    + ["upcoming_partial_visibility"] * 3
    + ["live_online_open"] * 4
    + ["live_hybrid_open"] * 3
    + ["live_onsite_closed"] * 2
    + ["past_auto_completed"] * 6
    + ["past_validation_reviewed"] * 5
    + ["cancelled_event"] * 3
    + ["draft_event"] * 4
)


CITY_BLUEPRINTS = [
    {"city": "Paris", "country": "France", "address": "42 rue du Faubourg Saint-Antoine, 75012 Paris"},
    {"city": "Lyon", "country": "France", "address": "18 quai Claude Bernard, 69007 Lyon"},
    {"city": "Marseille", "country": "France", "address": "21 boulevard Michelet, 13008 Marseille"},
    {"city": "Lille", "country": "France", "address": "14 rue de Gand, 59800 Lille"},
    {"city": "Bordeaux", "country": "France", "address": "9 cours Pasteur, 33000 Bordeaux"},
    {"city": "Toulouse", "country": "France", "address": "27 allees Jean Jaures, 31000 Toulouse"},
    {"city": "Nantes", "country": "France", "address": "5 rue Scribe, 44000 Nantes"},
    {"city": "Montpellier", "country": "France", "address": "48 avenue de Lodve, 34000 Montpellier"},
]

ONLINE_PLATFORMS = ["Zoom", "Microsoft Teams", "Livestorm", "Google Meet", "YouTube Live", "Airmeet"]


def ensure_media_dirs():
    for directory in (AVATAR_DIR, LOGO_DIR, BANNER_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def cleanup_demo_assets():
    for directory in (AVATAR_DIR, LOGO_DIR, BANNER_DIR):
        for path in directory.glob("demo_*"):
            path.unlink(missing_ok=True)


def write_demo_asset(directory: Path, filename: str, content: str) -> Path:
    path = directory / filename
    path.write_text(content, encoding="utf-8")
    return path


def media_url(subdir: str, filename: str) -> str:
    return f"{BACKEND_BASE_URL}/media/{subdir}/{filename}"


def to_slug(value: str) -> str:
    return value.lower().replace(" ", "-").replace(".", "").replace("&", "and").replace("'", "")


def get_tags(tag_names):
    tags = []
    for name in tag_names:
        tag, _ = Tag.objects.get_or_create(name=name)
        tags.append(tag)
    return tags


def initials_for(name: str) -> str:
    pieces = [piece[0] for piece in name.replace("-", " ").split() if piece and piece[0].isalnum()]
    return "".join(pieces[:2]).upper() or "NV"


def build_avatar_svg(full_name: str, primary: str, secondary: str) -> str:
    safe_name = escape(full_name)
    initials = initials_for(full_name)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{primary}" />
      <stop offset="100%" stop-color="{secondary}" />
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="160" fill="url(#grad)" />
  <circle cx="160" cy="160" r="118" fill="rgba(255,255,255,0.12)" />
  <text x="160" y="176" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="98" font-weight="700" fill="#ffffff">{initials}</text>
  <text x="160" y="286" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="rgba(255,255,255,0.88)">{safe_name}</text>
</svg>"""


def build_company_logo_svg(company_name: str, primary: str, secondary: str) -> str:
    safe_name = escape(company_name)
    initials = initials_for(company_name)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{primary}" />
      <stop offset="100%" stop-color="{secondary}" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="72" fill="url(#grad)" />
  <rect x="42" y="42" width="428" height="428" rx="46" fill="rgba(255,255,255,0.08)" />
  <text x="256" y="260" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="156" font-weight="700" fill="#ffffff">{initials}</text>
  <text x="256" y="408" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="rgba(255,255,255,0.9)">{safe_name}</text>
</svg>"""


def build_banner_svg(title: str, company_name: str, primary: str, secondary: str, subtitle: str) -> str:
    safe_title = escape(title[:72])
    safe_company = escape(company_name)
    safe_subtitle = escape(subtitle[:92])
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="480" viewBox="0 0 1600 480">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{primary}" />
      <stop offset="100%" stop-color="{secondary}" />
    </linearGradient>
  </defs>
  <rect width="1600" height="480" rx="32" fill="url(#grad)" />
  <circle cx="1320" cy="80" r="220" fill="rgba(255,255,255,0.06)" />
  <circle cx="150" cy="430" r="180" fill="rgba(255,255,255,0.07)" />
  <text x="110" y="130" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="rgba(255,255,255,0.82)">{safe_company}</text>
  <text x="110" y="235" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700" fill="#ffffff">{safe_title}</text>
  <text x="110" y="308" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">{safe_subtitle}</text>
</svg>"""


def assign_temporal_fields(instance, joined_days_ago: int):
    joined_at = now - timedelta(days=joined_days_ago, hours=randomizer.randint(1, 20))
    instance.date_joined = joined_at
    instance.save(update_fields=["date_joined"])


def create_participants():
    participants = []
    for blueprint in PARTICIPANT_BLUEPRINTS:
        full_name = f"{blueprint['first_name']} {blueprint['last_name']}"
        avatar_filename = f"demo_avatar_{to_slug(full_name)}.svg"
        colors = blueprint["color"]
        write_demo_asset(AVATAR_DIR, avatar_filename, build_avatar_svg(full_name, colors[0], colors[1]))

        participant = CustomUser.objects.create_user(
            role=UserRole.PARTICIPANT,
            email=blueprint["email"],
            password=PARTICIPANT_PASSWORD,
            first_name=blueprint["first_name"],
            last_name=blueprint["last_name"],
            employer_name=blueprint["employer_name"],
            participant_profile_type=blueprint["profile_type"],
            school_name=blueprint.get("school_name", ""),
            study_level=blueprint.get("study_level", ""),
            professional_company_name=blueprint.get("professional_company_name", ""),
            job_title=blueprint.get("job_title", ""),
            job_started_at=blueprint.get("job_started_at"),
            participant_avatar_url=media_url("avatars", avatar_filename),
            participant_bio=blueprint["bio"],
            favorite_domain=blueprint["favorite_domain"],
            personal_website_url=blueprint["website"],
            github_url=blueprint["github"],
            participant_linkedin_url=blueprint["linkedin"],
            is_active=blueprint["active"],
        )
        participant.tags.set(get_tags(blueprint["tag_names"]))
        assign_temporal_fields(participant, blueprint["joined_days_ago"])
        participants.append(participant)
    return participants


def build_company_description(blueprint):
    return (
        f"{blueprint['company_name']} anime des initiatives autour de {blueprint['focus']}. "
        "Le compte demo est volontairement tres complet pour tester le profil public, le dashboard entreprise, "
        "la moderation admin et les differents etats de verification."
    )


DIRECT_COMPANY_LOGO_URLS = {
    "mistral-ai": "https://mistral.ai/img/mistral-ai-logo.svg",
    "doctolib": "https://assets.doctolib.fr/img/cms/logo-blue.png",
    "iqvia": "https://s201.q4cdn.com/364468738/files/design/1image.jpg",
}


def official_company_logo_url(identifier: str, website_url: str) -> str:
    if identifier in DIRECT_COMPANY_LOGO_URLS:
        return DIRECT_COMPANY_LOGO_URLS[identifier]

    parsed = urlparse(website_url)
    host = parsed.netloc or parsed.path
    host = host.strip("/")
    return f"https://{host}/favicon.ico"


def fake_siret(index: int) -> str:
    return f"990{index + 1:03d}{randomizer.randint(10000000, 99999999)}"[:14]


def social_url(network: str, identifier: str) -> str:
    if network == "linkedin":
        return f"https://www.linkedin.com/company/{identifier}"
    if network == "youtube":
        return f"https://www.youtube.com/@{identifier}"
    if network == "twitter":
        return f"https://x.com/{identifier}"
    if network == "instagram":
        return f"https://www.instagram.com/{identifier}"
    if network == "facebook":
        return f"https://www.facebook.com/{identifier}"
    raise ValueError(f"Unsupported network: {network}")


def create_companies():
    companies = []
    for index, blueprint in enumerate(COMPANY_BLUEPRINTS, start=1):
        company = CustomUser.objects.create_user(
            role=UserRole.COMPANY,
            email=None,
            password=COMPANY_PASSWORD,
            company_identifier=blueprint["identifier"],
            recovery_email=f"contact@{blueprint['identifier']}.neurovent.demo",
            company_name=blueprint["company_name"],
            company_description=build_company_description(blueprint),
            company_logo_url=official_company_logo_url(blueprint["identifier"], blueprint["website"]),
            website_url=blueprint["website"],
            youtube_url=social_url("youtube", blueprint["identifier"]),
            linkedin_url=social_url("linkedin", blueprint["identifier"]),
            twitter_url=social_url("twitter", blueprint["identifier"]),
            instagram_url=social_url("instagram", blueprint["identifier"]),
            facebook_url=social_url("facebook", blueprint["identifier"]),
            siret=fake_siret(index),
            legal_representative=blueprint["legal_representative"],
            verification_status=blueprint["verification_status"],
            verification_source="AUTO" if blueprint["verification_status"] == VerificationStatus.VERIFIED else "MANUAL",
            review_note=blueprint["review_note"],
            verified_at=(
                now - timedelta(days=randomizer.randint(15, 220))
                if blueprint["verification_status"] == VerificationStatus.VERIFIED
                else None
            ),
            is_active=blueprint["active"],
        )
        company.tags.set(get_tags(blueprint["tag_names"]))
        assign_temporal_fields(company, 14 + index * 4)
        companies.append(company)
    return companies


def create_admin():
    admin = CustomUser.objects.create_superuser(
        email="admin@neurovent.demo",
        password=ADMIN_PASSWORD,
        first_name="Neurovent",
        last_name="Admin",
        role=UserRole.ADMIN,
    )
    admin.date_joined = now - timedelta(days=240)
    admin.save(update_fields=["date_joined"])
    return admin


def choose_format_for_scenario(scenario_name: str, index: int) -> str:
    if scenario_name == "live_online_open":
        return EventFormat.ONLINE
    if scenario_name == "live_hybrid_open":
        return EventFormat.HYBRID
    if scenario_name == "live_onsite_closed":
        return EventFormat.ONSITE
    if scenario_name == "upcoming_partial_visibility":
        return EventFormat.HYBRID if index % 2 == 0 else EventFormat.ONSITE
    cycle = [EventFormat.ONSITE, EventFormat.ONLINE, EventFormat.HYBRID]
    return cycle[index % len(cycle)]


def scenario_window(scenario_name: str, index: int):
    if scenario_name.startswith("upcoming"):
        start = now + timedelta(days=7 + index, hours=8 + (index % 6))
        end = start + timedelta(hours=3 + (index % 5))
        return start, end
    if scenario_name == "live_online_open":
        start = now - timedelta(hours=1 + (index % 3))
        end = now + timedelta(hours=2 + (index % 4))
        return start, end
    if scenario_name == "live_hybrid_open":
        start = now - timedelta(hours=2)
        end = now + timedelta(hours=3 + (index % 3))
        return start, end
    if scenario_name == "live_onsite_closed":
        start = now - timedelta(hours=1 + (index % 2))
        end = now + timedelta(hours=1 + (index % 2))
        return start, end
    if scenario_name.startswith("past"):
        end = now - timedelta(days=4 + index, hours=1 + (index % 5))
        start = end - timedelta(hours=4 + (index % 4))
        return start, end
    if scenario_name == "cancelled_event":
        if index % 2 == 0:
            start = now + timedelta(days=9 + index, hours=10)
        else:
            start = now - timedelta(days=6 + index, hours=4)
        end = start + timedelta(hours=4)
        return start, end
    if scenario_name == "draft_event":
        start = now + timedelta(days=28 + index, hours=9)
        end = start + timedelta(hours=4)
        return start, end
    raise ValueError(f"Unknown scenario {scenario_name}")


def build_event_blueprint(company, scenario_name: str, index: int):
    theme = EVENT_THEME_BLUEPRINTS[index % len(EVENT_THEME_BLUEPRINTS)]
    fmt = choose_format_for_scenario(scenario_name, index)
    start, end = scenario_window(scenario_name, index)

    if scenario_name in {"upcoming_validation_queue", "upcoming_closed_deadline", "past_validation_reviewed"}:
        registration_mode = RegistrationMode.VALIDATION
    else:
        registration_mode = RegistrationMode.AUTO

    status = EventStatus.PUBLISHED
    if scenario_name == "cancelled_event":
        status = EventStatus.CANCELLED
    elif scenario_name == "draft_event":
        status = EventStatus.DRAFT

    allow_registration_during_event = scenario_name in {"live_online_open", "live_hybrid_open"}

    unlimited_capacity = scenario_name in {"upcoming_auto_open", "live_online_open"} and index % 3 == 0
    if scenario_name in {"upcoming_auto_full", "upcoming_validation_queue", "upcoming_closed_deadline"}:
        unlimited_capacity = False

    if unlimited_capacity:
        capacity = 0
    elif scenario_name == "upcoming_auto_full":
        capacity = 8 + (index % 5)
    elif scenario_name in {"upcoming_auto_open", "upcoming_validation_queue", "upcoming_closed_deadline", "upcoming_partial_visibility"}:
        capacity = 18 + (index % 5) * 6
    elif scenario_name in {"live_online_open", "live_hybrid_open", "live_onsite_closed"}:
        capacity = 14 + (index % 4) * 5
    elif scenario_name.startswith("past"):
        capacity = 20 + (index % 6) * 4
    elif scenario_name == "cancelled_event":
        capacity = 24 + (index % 3) * 6
    else:
        capacity = 30 + (index % 4) * 10

    registration_deadline = None
    if scenario_name in {"upcoming_auto_full", "upcoming_auto_open", "upcoming_validation_queue", "upcoming_partial_visibility"}:
        registration_deadline = start - timedelta(days=2)
    elif scenario_name == "upcoming_closed_deadline":
        registration_deadline = now - timedelta(hours=6 + index)

    city_data = CITY_BLUEPRINTS[index % len(CITY_BLUEPRINTS)]
    address_visibility = AddressVisibility.FULL
    address_reveal_date = None
    online_visibility = OnlineVisibility.FULL
    online_reveal_date = None
    address_full = ""
    address_city = ""
    address_country = ""
    online_platform = ""
    online_link = ""

    if fmt in {EventFormat.ONSITE, EventFormat.HYBRID}:
        address_full = city_data["address"]
        address_city = city_data["city"]
        address_country = city_data["country"]
        if scenario_name == "upcoming_partial_visibility":
            address_visibility = AddressVisibility.PARTIAL
            address_reveal_date = start - timedelta(days=1) if index % 2 == 0 else start + timedelta(hours=1)

    if fmt in {EventFormat.ONLINE, EventFormat.HYBRID}:
        online_platform = ONLINE_PLATFORMS[index % len(ONLINE_PLATFORMS)]
        online_link = f"https://events.neurovent.demo/live/{company.company_identifier}-{index + 1}"
        if scenario_name == "upcoming_partial_visibility":
            online_visibility = OnlineVisibility.PARTIAL
            online_reveal_date = start - timedelta(hours=12) if index % 2 == 0 else start + timedelta(hours=2)

    title = f"{theme['focus']} {theme['series']} - {company.company_name}"
    description = (
        f"{title} rassemble {theme['audience']} autour de {theme['description_focus']}. "
        f"Cette session est concue par {company.company_name} pour produire {theme['deliverable']}. "
        "Le dataset de demo couvre volontairement plusieurs situations de capacite, validation, live, liste d'attente et moderation admin."
    )

    banner_filename = f"demo_banner_event_{index + 1:02d}.svg"
    write_demo_asset(
        BANNER_DIR,
        banner_filename,
        build_banner_svg(
            title,
            company.company_name,
            COMPANY_COLOR_LOOKUP[company.company_identifier][0],
            COMPANY_COLOR_LOOKUP[company.company_identifier][1],
            f"{fmt} - {registration_mode} - scenario {scenario_name.replace('_', ' ')}",
        ),
    )

    return {
        "company": company,
        "title": title,
        "description": description,
        "date_start": start,
        "date_end": end,
        "capacity": capacity,
        "unlimited_capacity": unlimited_capacity,
        "status": status,
        "view_count": 40 + index * 17,
        "format": fmt,
        "registration_mode": registration_mode,
        "registration_deadline": registration_deadline,
        "allow_registration_during_event": allow_registration_during_event,
        "address_full": address_full,
        "address_city": address_city,
        "address_country": address_country,
        "address_visibility": address_visibility,
        "address_reveal_date": address_reveal_date,
        "online_platform": online_platform,
        "online_link": online_link,
        "online_visibility": online_visibility,
        "online_reveal_date": online_reveal_date,
        "banner": f"banners/{banner_filename}",
        "tag_names": theme["tag_names"],
        "scenario": scenario_name,
        "created_days_ago": max(1, 140 - index * 2),
    }


def create_events(companies):
    event_companies = companies[:25]
    events_with_meta = []
    for index, scenario_name in enumerate(SCENARIO_SEQUENCE):
        company = event_companies[index % len(event_companies)]
        blueprint = build_event_blueprint(company, scenario_name, index)
        event = Event.objects.create(
            company=blueprint["company"],
            title=blueprint["title"],
            description=blueprint["description"],
            banner=blueprint["banner"],
            date_start=blueprint["date_start"],
            date_end=blueprint["date_end"],
            capacity=blueprint["capacity"],
            unlimited_capacity=blueprint["unlimited_capacity"],
            status=blueprint["status"],
            view_count=blueprint["view_count"],
            format=blueprint["format"],
            registration_mode=blueprint["registration_mode"],
            registration_deadline=blueprint["registration_deadline"],
            allow_registration_during_event=blueprint["allow_registration_during_event"],
            address_full=blueprint["address_full"],
            address_city=blueprint["address_city"],
            address_country=blueprint["address_country"],
            address_visibility=blueprint["address_visibility"],
            address_reveal_date=blueprint["address_reveal_date"],
            online_platform=blueprint["online_platform"],
            online_link=blueprint["online_link"],
            online_visibility=blueprint["online_visibility"],
            online_reveal_date=blueprint["online_reveal_date"],
        )
        event.tags.set(get_tags(blueprint["tag_names"]))
        event.created_at = now - timedelta(days=blueprint["created_days_ago"])
        event.updated_at = event.created_at + timedelta(days=randomizer.randint(0, 9), hours=randomizer.randint(0, 12))
        event.save(update_fields=["created_at", "updated_at"])
        events_with_meta.append((event, blueprint))
    return events_with_meta


def registration_mix_for(event, blueprint):
    scenario = blueprint["scenario"]
    capacity = event.capacity

    if scenario == "upcoming_auto_full":
        confirmed = capacity
        return {
            RegistrationStatus.CONFIRMED: confirmed,
            RegistrationStatus.WAITLIST: 2 + (event.id % 2),
            RegistrationStatus.CANCELLED: 1,
        }
    if scenario == "upcoming_auto_open":
        return {
            RegistrationStatus.CONFIRMED: 5 + (event.id % 4),
            RegistrationStatus.CANCELLED: 1 + (event.id % 2),
        }
    if scenario == "upcoming_validation_queue":
        return {
            RegistrationStatus.CONFIRMED: 4 + (event.id % 3),
            RegistrationStatus.PENDING: 3 + (event.id % 3),
            RegistrationStatus.REJECTED: 2,
            RegistrationStatus.CANCELLED: 1,
        }
    if scenario == "upcoming_closed_deadline":
        return {
            RegistrationStatus.CONFIRMED: 4 + (event.id % 3),
            RegistrationStatus.PENDING: 2,
            RegistrationStatus.REJECTED: 1 + (event.id % 2),
            RegistrationStatus.CANCELLED: 1,
        }
    if scenario == "upcoming_partial_visibility":
        if event.registration_mode == RegistrationMode.AUTO:
            return {
                RegistrationStatus.CONFIRMED: 5 + (event.id % 3),
                RegistrationStatus.CANCELLED: 1,
            }
        return {
            RegistrationStatus.CONFIRMED: 4,
            RegistrationStatus.PENDING: 3,
            RegistrationStatus.REJECTED: 1,
        }
    if scenario == "live_online_open":
        return {
            RegistrationStatus.CONFIRMED: 6 + (event.id % 4),
            RegistrationStatus.CANCELLED: 1,
        }
    if scenario == "live_hybrid_open":
        return {
            RegistrationStatus.CONFIRMED: 6 + (event.id % 3),
            RegistrationStatus.CANCELLED: event.id % 2,
        }
    if scenario == "live_onsite_closed":
        return {
            RegistrationStatus.CONFIRMED: 7 + (event.id % 2),
        }
    if scenario == "past_auto_completed":
        return {
            RegistrationStatus.CONFIRMED: 6 + (event.id % 4),
            RegistrationStatus.CANCELLED: 1 + (event.id % 2),
        }
    if scenario == "past_validation_reviewed":
        return {
            RegistrationStatus.CONFIRMED: 5 + (event.id % 3),
            RegistrationStatus.REJECTED: 2 + (event.id % 2),
            RegistrationStatus.CANCELLED: 1,
        }
    if scenario == "cancelled_event":
        return {
            RegistrationStatus.CONFIRMED: 2 + (event.id % 2),
            RegistrationStatus.CANCELLED: 3,
            RegistrationStatus.REJECTED: 1 if event.registration_mode == RegistrationMode.VALIDATION else 0,
        }
    return {}


def registration_comment(status: str, participant: CustomUser, event: Event) -> str:
    if status == RegistrationStatus.PENDING:
        return f"Profil a valider avant confirmation finale pour {participant.first_name}."
    if status == RegistrationStatus.REJECTED:
        return "Creneau reserve a un autre format de public cible pour cette edition."
    if status == RegistrationStatus.CANCELLED:
        return "Inscription retiree ou annulee apres echange avec l'organisateur."
    if status == RegistrationStatus.CONFIRMED and event.registration_mode == RegistrationMode.VALIDATION:
        return "Profil valide manuellement par l'equipe organisatrice."
    return ""


def accessibility_note(participant: CustomUser, order_index: int) -> str:
    notes = [
        "Besoin d'un acces PMR proche de la salle principale.",
        "Sous-titres temps reel souhaites pour la session live.",
        "Merci de prevoir un espace calme pendant les temps de pause.",
        "Aucun besoin particulier.",
    ]
    if order_index % 5 == 0:
        return notes[0]
    if order_index % 7 == 0:
        return notes[1]
    if order_index % 11 == 0:
        return notes[2]
    return "" if order_index % 2 else notes[3]


def create_registration(participant, event, status, order_index):
    registration = Registration.objects.create(
        participant=participant,
        event=event,
        status=status,
        accessibility_needs=accessibility_note(participant, order_index),
        company_comment=registration_comment(status, participant, event),
    )

    if event.date_start > now:
        created_at = event.date_start - timedelta(days=12 - min(order_index, 10), hours=order_index % 6)
    else:
        created_at = event.date_start - timedelta(days=3 + (order_index % 4), hours=order_index % 5)
    registration.created_at = created_at
    registration.updated_at = created_at + timedelta(hours=4 + (order_index % 6))
    registration.save(update_fields=["created_at", "updated_at"])
    return registration


def populate_registrations(events_with_meta, participants):
    all_participants = list(participants)
    for event, blueprint in events_with_meta:
        if blueprint["scenario"] == "draft_event":
            continue

        mix = registration_mix_for(event, blueprint)
        total_needed = sum(max(0, count) for count in mix.values())
        if total_needed == 0:
            continue

        ordered_statuses = []
        for status in [
            RegistrationStatus.CONFIRMED,
            RegistrationStatus.PENDING,
            RegistrationStatus.WAITLIST,
            RegistrationStatus.REJECTED,
            RegistrationStatus.CANCELLED,
        ]:
            ordered_statuses.extend([status] * max(0, mix.get(status, 0)))

        if len(ordered_statuses) > len(all_participants):
            raise RuntimeError(f"Event {event.title} requires more unique participants than available.")

        participant_pool = randomizer.sample(all_participants, k=len(ordered_statuses))
        for order_index, (participant, status) in enumerate(zip(participant_pool, ordered_statuses), start=1):
            create_registration(participant, event, status, order_index)


def reset_database():
    Registration.objects.all().delete()
    Event.objects.all().delete()
    CustomUser.objects.all().delete()


def summary_lines():
    return [
        f"Participants: {CustomUser.objects.filter(role=UserRole.PARTICIPANT).count()}",
        f"Companies: {CustomUser.objects.filter(role=UserRole.COMPANY).count()}",
        f"  Verified: {CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.VERIFIED).count()}",
        f"  Needs review: {CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.NEEDS_REVIEW).count()}",
        f"  Pending: {CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.PENDING).count()}",
        f"  Rejected: {CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.REJECTED).count()}",
        f"Admins: {CustomUser.objects.filter(role=UserRole.ADMIN).count()}",
        f"Events: {Event.objects.count()}",
        f"Registrations: {Registration.objects.count()}",
        f"  Confirmed: {Registration.objects.filter(status=RegistrationStatus.CONFIRMED).count()}",
        f"  Pending: {Registration.objects.filter(status=RegistrationStatus.PENDING).count()}",
        f"  Waitlist: {Registration.objects.filter(status=RegistrationStatus.WAITLIST).count()}",
        f"  Rejected: {Registration.objects.filter(status=RegistrationStatus.REJECTED).count()}",
        f"  Cancelled: {Registration.objects.filter(status=RegistrationStatus.CANCELLED).count()}",
    ]


COMPANY_COLOR_LOOKUP = {blueprint["identifier"]: blueprint["colors"] for blueprint in COMPANY_BLUEPRINTS}


def main():
    if len(SCENARIO_SEQUENCE) != 50:
        raise RuntimeError("The demo seed must create exactly 50 events.")

    ensure_media_dirs()
    cleanup_demo_assets()

    with transaction.atomic():
        reset_database()
        participants = create_participants()
        companies = create_companies()
        create_admin()
        events_with_meta = create_events(companies)
        populate_registrations(events_with_meta, participants)

    print("Demo seed completed.")
    for line in summary_lines():
        print(line)
    print("")
    print("Participant sample login:")
    print(f"  email={PARTICIPANT_BLUEPRINTS[0]['email']}")
    print(f"  password={PARTICIPANT_PASSWORD}")
    print("")
    print("Company sample login:")
    print(f"  identifier={COMPANY_BLUEPRINTS[0]['identifier']}")
    print(f"  password={COMPANY_PASSWORD}")
    print("")
    print("Admin login:")
    print("  email=admin@neurovent.demo")
    print(f"  password={ADMIN_PASSWORD}")


if __name__ == "__main__":
    main()
