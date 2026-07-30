import cors from "cors";
import express from "express";
import type { Notation } from "@colimo/shared";
import {
  coursiers,
  courses,
  creerInscriptionCoursier,
  findUtilisateur,
  notations,
  nextId,
  utilisateurs,
} from "./store";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// --- Utilisateurs ---------------------------------------------------------

app.get("/utilisateurs", (_req, res) => {
  res.json(utilisateurs);
});

app.get("/utilisateurs/:id", (req, res) => {
  const utilisateur = findUtilisateur(req.params.id);
  if (!utilisateur) return res.status(404).json({ error: "Utilisateur introuvable" });
  res.json(utilisateur);
});

// --- Coursiers -------------------------------------------------------------

app.get("/coursiers", (_req, res) => {
  const avecUtilisateur = coursiers.map((coursier) => ({
    ...coursier,
    utilisateur: findUtilisateur(coursier.utilisateurId),
  }));
  res.json(avecUtilisateur);
});

app.post("/coursiers/inscription", (req, res) => {
  const { nom, telephone, zone, typeVehicule, documents } = req.body ?? {};
  if (!nom || !telephone || !zone || !typeVehicule) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }
  const result = creerInscriptionCoursier({
    nom,
    telephone,
    zone,
    typeVehicule,
    documents: Array.isArray(documents) ? documents : [],
  });
  res.status(201).json(result);
});

app.patch("/coursiers/:id", (req, res) => {
  const coursier = coursiers.find((c) => c.id === req.params.id);
  if (!coursier) return res.status(404).json({ error: "Coursier introuvable" });

  const { statutVerification, disponibilite } = req.body ?? {};
  if (statutVerification) coursier.statutVerification = statutVerification;
  if (typeof disponibilite === "boolean") coursier.disponibilite = disponibilite;

  res.json(coursier);
});

// --- Courses -----------------------------------------------------------

app.get("/courses", (req, res) => {
  const { zone, statut, clientId, coursierId } = req.query;
  let resultat = courses;
  if (zone) resultat = resultat.filter((c) => c.zoneDepart === zone);
  if (statut) resultat = resultat.filter((c) => c.statut === statut);
  if (clientId) resultat = resultat.filter((c) => c.clientId === clientId);
  if (coursierId) resultat = resultat.filter((c) => c.coursierId === coursierId);
  res.json(resultat);
});

app.get("/courses/:id", (req, res) => {
  const course = courses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: "Course introuvable" });
  res.json(course);
});

app.post("/courses", (req, res) => {
  const body = req.body ?? {};
  const requis = ["clientId", "adresseDepart", "adresseArrivee", "zoneDepart", "zoneArrivee", "typeColis", "prix"];
  for (const champ of requis) {
    if (body[champ] === undefined) return res.status(400).json({ error: `Champ requis manquant : ${champ}` });
  }

  const course = {
    id: nextId("co"),
    clientId: body.clientId,
    coursierId: null,
    adresseDepart: body.adresseDepart,
    adresseArrivee: body.adresseArrivee,
    zoneDepart: body.zoneDepart,
    zoneArrivee: body.zoneArrivee,
    typeColis: body.typeColis,
    livraisonPrioritaire: Boolean(body.livraisonPrioritaire),
    valeurDeclaree: body.valeurDeclaree,
    prix: body.prix,
    statut: "en_attente" as const,
    createdAt: new Date().toISOString(),
  };
  courses.push(course);
  res.status(201).json(course);
});

app.patch("/courses/:id", (req, res) => {
  const course = courses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: "Course introuvable" });

  const { statut, coursierId } = req.body ?? {};
  if (statut) course.statut = statut;
  if (coursierId !== undefined) course.coursierId = coursierId;

  res.json(course);
});

// --- Notations ---------------------------------------------------------

app.get("/notations", (req, res) => {
  const { courseId } = req.query;
  const resultat = courseId ? notations.filter((n) => n.courseId === courseId) : notations;
  res.json(resultat);
});

app.post("/notations", (req, res) => {
  const { courseId, auteurId, destinataireId, note, commentaire } = req.body ?? {};
  if (!courseId || !auteurId || !destinataireId || !note) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }
  const notation: Notation = {
    id: nextId("n"),
    courseId,
    auteurId,
    destinataireId,
    note,
    commentaire,
  };
  notations.push(notation);
  res.status(201).json(notation);
});

app.listen(PORT, () => {
  console.log(`COLIMO API mock en écoute sur http://localhost:${PORT}`);
});
