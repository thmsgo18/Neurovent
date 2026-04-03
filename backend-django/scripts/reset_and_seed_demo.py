from datetime import timedelta
import random

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
from users.models import CustomUser, UserRole, VerificationStatus


PARTICIPANT_PASSWORD = "Participant2026!"
COMPANY_PASSWORD = "Company2026!"
ADMIN_PASSWORD = "Admin2026!"

randomizer = random.Random(20260403)
now = timezone.now()


participant_rows = [
    ("Amelie", "Rousseau", "amelie.rousseau@participants.neurovent.demo", "Institut Pasteur"),
    ("Lucas", "Bernard", "lucas.bernard@participants.neurovent.demo", "Sorbonne Universite"),
    ("Ines", "Martin", "ines.martin@participants.neurovent.demo", "INRIA"),
    ("Noah", "Petit", "noah.petit@participants.neurovent.demo", "Inserm"),
    ("Jade", "Garcia", "jade.garcia@participants.neurovent.demo", "CNRS"),
    ("Ethan", "Lopez", "ethan.lopez@participants.neurovent.demo", "Universite de Bordeaux"),
    ("Chloe", "Morel", "chloe.morel@participants.neurovent.demo", "Ecole Polytechnique"),
    ("Arthur", "Simon", "arthur.simon@participants.neurovent.demo", "Grenoble Alpes"),
    ("Lina", "Laurent", "lina.laurent@participants.neurovent.demo", "CHU de Lille"),
    ("Hugo", "Michel", "hugo.michel@participants.neurovent.demo", "CEA"),
    ("Sarah", "Lefevre", "sarah.lefevre@participants.neurovent.demo", "Universite de Strasbourg"),
    ("Leo", "Andre", "leo.andre@participants.neurovent.demo", "ENS"),
    ("Maya", "Robert", "maya.robert@participants.neurovent.demo", "Necker Hospital"),
    ("Nathan", "Richard", "nathan.richard@participants.neurovent.demo", "Universite Paris-Saclay"),
    ("Eva", "Thomas", "eva.thomas@participants.neurovent.demo", "Aix-Marseille Universite"),
    ("Raphael", "Durand", "raphael.durand@participants.neurovent.demo", "Gustave Roussy"),
    ("Camille", "Dubois", "camille.dubois@participants.neurovent.demo", "AP-HP"),
    ("Tom", "Blanc", "tom.blanc@participants.neurovent.demo", "Universite de Nantes"),
    ("Lea", "Giraud", "lea.giraud@participants.neurovent.demo", "Universite de Montpellier"),
    ("Adam", "Masson", "adam.masson@participants.neurovent.demo", "IMT Atlantique"),
]

verified_company_rows = [
    ("atlas-neuro-labs", "Atlas Neuro Labs"),
    ("synapse-forge", "Synapse Forge"),
    ("axonbridge-health", "AxonBridge Health"),
    ("cortex-insight", "Cortex Insight"),
    ("neurogrid-europe", "NeuroGrid Europe"),
    ("mindmesh-systems", "MindMesh Systems"),
    ("brainloom-studio", "BrainLoom Studio"),
    ("signal-harbor", "Signal Harbor"),
    ("deepneuro-partners", "DeepNeuro Partners"),
    ("cognitive-orbit", "Cognitive Orbit"),
    ("quantum-axon", "Quantum Axon"),
    ("lucid-neurotech", "Lucid Neurotech"),
    ("neural-bloom", "Neural Bloom"),
    ("white-matter-labs", "White Matter Labs"),
    ("eeg-horizon", "EEG Horizon"),
]

review_company_rows = [
    ("nova-neuro", "Nova Neuro", "Website domain mismatch detected during automatic verification."),
    ("cerebra-link", "Cerebra Link", "SIRET found but legal representative spelling needs manual confirmation."),
    ("neurovista-hub", "NeuroVista Hub", "Public registry address differs from website contact address."),
    ("axon-collective", "Axon Collective", "Automatic verification flagged a discrepancy in company naming."),
    ("brainport-works", "BrainPort Works", "Additional supporting document requested for company validation."),
]

event_titles = [
    "Clinical NeuroAI Summit",
    "Translational Brain Imaging Forum",
    "Digital Biomarkers Workshop",
    "Neural Interfaces Roundtable",
    "Applied Cognitive Systems Lab Day",
    "Brain-Computer Interaction Meetup",
    "Neurodata Standards Bootcamp",
    "Responsible Neurotech Exchange",
    "Precision Psychiatry Symposium",
    "Computational Neuroscience in Practice",
    "Signal Processing for EEG Teams",
    "Hybrid Research Ops Conference",
    "Future of Neuroinformatics",
    "Clinical Research Design Masterclass",
    "Machine Learning for MRI Teams",
    "Research Platform Leadership Day",
    "Neural Product Validation Sprint",
    "Open Science and Reproducibility Session",
]

event_descriptions = [
    "A full-day gathering focused on practical collaboration between research teams, product owners, and scientific organizations working on neuroscience and health innovation.",
    "An applied event designed to share methods, datasets, and operational lessons for teams scaling ambitious research programs across multiple institutions.",
    "A collaborative session on building stronger event pipelines, participant experiences, and measurable outcomes for scientific communities.",
]

city_rows = [
    ("Paris", "France", "12 rue des Sciences, 75005 Paris"),
    ("Lyon", "France", "24 avenue des Freres Lumiere, 69008 Lyon"),
    ("Marseille", "France", "8 quai de la Joliette, 13002 Marseille"),
    ("Lille", "France", "17 boulevard Carnot, 59800 Lille"),
    ("Bordeaux", "France", "5 cours Victor Hugo, 33000 Bordeaux"),
    ("Toulouse", "France", "32 allee Jean Jaures, 31000 Toulouse"),
]

platform_rows = ["Zoom", "Teams", "Livestorm", "YouTube Live", "Hopin"]


def pick_tags(count):
    tags = list(Tag.objects.all())
    if len(tags) < count:
        raise RuntimeError("Not enough tags in database to seed demo users and events.")
    return randomizer.sample(tags, count)


def create_participants():
    participants = []
    for idx, (first_name, last_name, email, employer_name) in enumerate(participant_rows, start=1):
      participant = CustomUser.objects.create_user(
            role=UserRole.PARTICIPANT,
            email=email,
            password=PARTICIPANT_PASSWORD,
            first_name=first_name,
            last_name=last_name,
            employer_name=employer_name,
        )
      participant.tags.set(pick_tags(4 if idx % 2 == 0 else 5))
      participants.append(participant)
    return participants


def build_company_profile(identifier, company_name, status, note=""):
    domain = identifier.replace("_", "-")
    company = CustomUser.objects.create_user(
        role=UserRole.COMPANY,
        password=COMPANY_PASSWORD,
        company_identifier=identifier,
        recovery_email=f"hello@{domain}.demo",
        company_name=company_name,
        company_description=f"{company_name} organizes scientific events around neuroscience, health data, and research operations.",
        website_url=f"https://www.{domain}.demo",
        linkedin_url=f"https://www.linkedin.com/company/{domain}",
        twitter_url=f"https://x.com/{domain}",
        youtube_url=f"https://www.youtube.com/@{domain}",
        instagram_url=f"https://www.instagram.com/{domain}",
        facebook_url=f"https://www.facebook.com/{domain}",
        siret=f"4932{randomizer.randint(1000000000, 9999999999)}"[:14],
        legal_representative=f"{company_name} Legal Representative",
        verification_status=status,
        verification_source="AUTO" if status == VerificationStatus.VERIFIED else "MANUAL",
        review_note=note,
        verified_at=now - timedelta(days=randomizer.randint(7, 120)) if status == VerificationStatus.VERIFIED else None,
    )
    company.tags.set(pick_tags(4))
    return company


def create_companies():
    verified = [
        build_company_profile(identifier, company_name, VerificationStatus.VERIFIED)
        for identifier, company_name in verified_company_rows
    ]
    needs_review = [
        build_company_profile(identifier, company_name, VerificationStatus.NEEDS_REVIEW, note)
        for identifier, company_name, note in review_company_rows
    ]
    return verified, needs_review


def create_admin():
    return CustomUser.objects.create_superuser(
        email="admin@neurovent.demo",
        password=ADMIN_PASSWORD,
        first_name="Neurovent",
        last_name="Admin",
        role=UserRole.ADMIN,
    )


def build_event(company, idx):
    title = event_titles[idx % len(event_titles)]
    description = event_descriptions[idx % len(event_descriptions)]
    fmt = [EventFormat.ONSITE, EventFormat.ONLINE, EventFormat.HYBRID][idx % 3]
    reg_mode = RegistrationMode.VALIDATION if idx % 2 else RegistrationMode.AUTO

    if idx < 10:
        start = now + timedelta(days=idx + 7, hours=(idx % 5) + 8)
        status = EventStatus.PUBLISHED
    elif idx < 14:
        start = now - timedelta(days=(idx - 9) * 8, hours=2)
        status = EventStatus.PUBLISHED
    elif idx < 16:
        start = now + timedelta(days=idx + 15)
        status = EventStatus.CANCELLED
    else:
        start = now + timedelta(days=idx + 20)
        status = EventStatus.DRAFT

    end = start + timedelta(hours=6)
    capacity = randomizer.randint(45, 140)
    city, country, address = city_rows[idx % len(city_rows)]

    event = Event.objects.create(
        company=company,
        title=title,
        description=description,
        date_start=start,
        date_end=end,
        capacity=capacity,
        status=status,
        view_count=randomizer.randint(24, 460),
        format=fmt,
        registration_mode=reg_mode,
        registration_deadline=(start - timedelta(days=2)) if status == EventStatus.PUBLISHED and start > now else None,
        address_full=address if fmt in [EventFormat.ONSITE, EventFormat.HYBRID] else "",
        address_city=city if fmt in [EventFormat.ONSITE, EventFormat.HYBRID] else "",
        address_country=country if fmt in [EventFormat.ONSITE, EventFormat.HYBRID] else "",
        address_visibility=AddressVisibility.FULL,
        online_platform=platform_rows[idx % len(platform_rows)] if fmt in [EventFormat.ONLINE, EventFormat.HYBRID] else "",
        online_link=f"https://meet.neurovent.demo/event-{idx+1}" if fmt in [EventFormat.ONLINE, EventFormat.HYBRID] else "",
        online_visibility=OnlineVisibility.FULL,
    )
    event.tags.set(pick_tags(3 if idx % 2 == 0 else 4))
    return event


def create_events(companies):
    events = []
    for idx, company in enumerate(companies[:12]):
        events.append(build_event(company, idx))
    for idx, company in enumerate(companies[:6], start=12):
        events.append(build_event(company, idx))
    return events


def populate_registrations(events, participants):
    for idx, event in enumerate(events):
        if event.status == EventStatus.DRAFT:
            continue

        sample_pool = randomizer.sample(participants, k=randomizer.randint(6, 14))

        if event.status == EventStatus.CANCELLED:
            counts = {"CONFIRMED": 3, "PENDING": 0, "WAITLIST": 0, "CANCELLED": 2}
        elif event.date_end < now:
            counts = {"CONFIRMED": randomizer.randint(4, 9), "PENDING": 0, "WAITLIST": 0, "CANCELLED": randomizer.randint(1, 3)}
        elif event.registration_mode == RegistrationMode.AUTO:
            confirmed = min(randomizer.randint(6, 12), event.capacity - 1)
            waitlist = randomizer.randint(0, 3)
            counts = {"CONFIRMED": confirmed, "PENDING": 0, "WAITLIST": waitlist, "CANCELLED": randomizer.randint(0, 2)}
        else:
            confirmed = min(randomizer.randint(4, 8), event.capacity - 1)
            counts = {"CONFIRMED": confirmed, "PENDING": randomizer.randint(2, 4), "WAITLIST": randomizer.randint(0, 2), "CANCELLED": randomizer.randint(0, 2)}

        reg_rows = (
            [RegistrationStatus.CONFIRMED] * counts["CONFIRMED"] +
            [RegistrationStatus.PENDING] * counts["PENDING"] +
            [RegistrationStatus.WAITLIST] * counts["WAITLIST"] +
            [RegistrationStatus.CANCELLED] * counts["CANCELLED"]
        )

        for offset, (participant, status) in enumerate(zip(sample_pool, reg_rows), start=1):
            Registration.objects.create(
                participant=participant,
                event=event,
                status=status,
                accessibility_needs="Wheelchair access requested." if offset % 6 == 0 else "",
                company_comment="Manual review needed." if status == RegistrationStatus.PENDING and offset % 2 == 0 else "",
            )


with transaction.atomic():
    Registration.objects.all().delete()
    Event.objects.all().delete()
    CustomUser.objects.all().delete()

    participants = create_participants()
    verified_companies, review_companies = create_companies()
    admin = create_admin()
    events = create_events(verified_companies)
    populate_registrations(events, participants)

print("Demo seed completed.")
print(f"Participants: {CustomUser.objects.filter(role=UserRole.PARTICIPANT).count()}")
print(f"Companies verified: {CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.VERIFIED).count()}")
print(f"Companies needs review: {CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.NEEDS_REVIEW).count()}")
print(f"Admins: {CustomUser.objects.filter(role=UserRole.ADMIN).count()}")
print(f"Events: {Event.objects.count()}")
print("")
print("Participant sample login:")
print(f"  email={participant_rows[0][2]}")
print(f"  password={PARTICIPANT_PASSWORD}")
print("")
print("Company sample login:")
print(f"  identifier={verified_company_rows[0][0]}")
print(f"  password={COMPANY_PASSWORD}")
print("")
print("Admin login:")
print("  email=admin@neurovent.demo")
print(f"  password={ADMIN_PASSWORD}")
