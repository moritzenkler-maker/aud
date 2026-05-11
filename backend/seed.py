"""Run once to seed default audit templates."""
import sys

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.audit import AuditTemplate, TemplateItem
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

TEMPLATES = [
    {
        "name": "Arbeitssicherheits-Audit",
        "category": "safety",
        "description": "Standardprüfung für Arbeitssicherheit nach DGUV",
        "items": [
            "Sicherheitszeichen und Kennzeichnungen sind vorhanden und lesbar",
            "Fluchtwege sind frei und gekennzeichnet",
            "Erste-Hilfe-Einrichtungen sind vollständig und zugänglich",
            "PSA (Persönliche Schutzausrüstung) ist vorhanden und in gutem Zustand",
            "Feuerlöscher sind vorhanden, gewartet und zugänglich",
            "Elektrische Anlagen sind geprüft und sicher",
            "Leitern und Tritte sind in einwandfreiem Zustand",
            "Gefahrenstoffe sind sicher gelagert und gekennzeichnet",
            "Sicherheitsunterweisungen sind dokumentiert und aktuell",
            "Unfallmeldebuch ist vorhanden und aktuell",
        ],
    },
    {
        "name": "Brandschutz-Begehung",
        "category": "fire",
        "description": "Regelmäßige Brandschutzbegehung gemäß ASR A2.2",
        "items": [
            "Brandmeldeanlagen sind funktionsfähig und gewartet",
            "Sprinkleranlagen sind einsatzbereit (falls vorhanden)",
            "Feuerlöscher sind korrekt positioniert und nicht abgelaufen",
            "Brandschutztüren schließen selbständig und vollständig",
            "Flure und Treppenhäuser sind frei von brennbaren Materialien",
            "Notbeleuchtung funktioniert bei Stromausfall",
            "Sammelplätze sind ausgeschildert",
            "Brandschutzordnung ist ausgehängt und aktuell",
            "Feuerwehrzufahrten sind freigehalten",
            "Elektrische Anlagen zeigen keine Brandgefährdung",
        ],
    },
    {
        "name": "Qualitäts-Audit ISO 9001",
        "category": "quality",
        "description": "Internes Qualitätsaudit nach ISO 9001:2015",
        "items": [
            "Qualitätsmanagementsystem ist dokumentiert und aktuell",
            "Prozessbeschreibungen sind vollständig und gültig",
            "Kundenanforderungen werden systematisch erfasst",
            "Produkt-/Dienstleistungsqualität wird regelmäßig geprüft",
            "Nichtkonformitäten werden dokumentiert und korrigiert",
            "Korrekturmaßnahmen sind wirksam und nachverfolgt",
            "Mitarbeiter sind geschult und qualifiziert",
            "Messmittel sind kalibriert und rückverfolgbar",
            "Lieferantenbewertungen werden durchgeführt",
            "Managementbewertungen finden statt",
        ],
    },
    {
        "name": "Umwelt-Audit",
        "category": "environment",
        "description": "Umweltrechtliche Compliance und Umweltschutzmaßnahmen",
        "items": [
            "Abfälle werden korrekt getrennt und entsorgt",
            "Gefährliche Stoffe werden vorschriftsmäßig gelagert",
            "Auffangwannen unter Öl-/Chemikalienbehältern vorhanden",
            "Energieverbrauch wird erfasst und optimiert",
            "Wasserverbrauch wird kontrolliert",
            "Lärmschutzmaßnahmen sind umgesetzt",
            "Umweltgenehmigungen sind aktuell und eingehalten",
            "Betriebsbeauftragte sind bestellt (Abfall, Gewässerschutz etc.)",
            "Notfallpläne für Umweltunfälle existieren",
            "Mitarbeiter sind in Umweltthemen geschult",
        ],
    },
    {
        "name": "Allgemeine Betriebsbegehung",
        "category": "general",
        "description": "Allgemeine Begehung für Ordnung, Sicherheit und Hygiene",
        "items": [
            "Ordnung und Sauberkeit am Arbeitsplatz ist gewährleistet",
            "Verkehrswege sind frei und sicher begehbar",
            "Beleuchtung ist ausreichend",
            "Raumtemperatur und Belüftung sind angemessen",
            "Sanitäreinrichtungen sind sauber und funktionsfähig",
            "Sozialräume sind ordentlich und hygienisch",
            "Arbeitsmittel sind in einwandfreiem Zustand",
            "Beschilderungen sind vollständig und lesbar",
            "Abfallbehälter sind vorhanden und geleert",
            "Digitale Zugangssicherungen funktionieren",
        ],
    },
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(AuditTemplate).count()
        if existing > 0:
            print(f"Already {existing} templates present, skipping.")
            return

        for tmpl_data in TEMPLATES:
            tmpl = AuditTemplate(
                name=tmpl_data["name"],
                category=tmpl_data["category"],
                description=tmpl_data["description"],
            )
            db.add(tmpl)
            db.flush()
            for i, text in enumerate(tmpl_data["items"]):
                db.add(TemplateItem(template_id=tmpl.id, text=text, order=i))
        db.commit()
        print(f"Seeded {len(TEMPLATES)} audit templates.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
