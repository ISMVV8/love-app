# Documentation Algorithme — Love App

## Analyse complète des algorithmes des apps de rencontre
*Basé sur : Tinder, Bumble, Hinge, Meetic, OkCupid*

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Score de désirabilité (ex-ELO)](#2-score-de-désirabilité)
3. [Tri du feed (Queue Ordering)](#3-tri-du-feed)
4. [Score de compatibilité](#4-score-de-compatibilité)
5. [Boost nouveaux utilisateurs](#5-boost-nouveaux-utilisateurs)
6. [Filtrage collaboratif](#6-filtrage-collaboratif)
7. [Gale-Shapley (Hinge)](#7-gale-shapley)
8. [Signaux comportementaux](#8-signaux-comportementaux)
9. [Anti-abus et qualité](#9-anti-abus-et-qualité)
10. [Implémentation Love App](#10-implémentation-love-app)

---

## 1. Vue d'ensemble

Toutes les grandes apps de rencontre utilisent un système multi-couche :

```
┌─────────────────────────────────────────────┐
│              COUCHE 1 — FILTRES              │
│    Genre, âge, distance, préférences         │
├─────────────────────────────────────────────┤
│          COUCHE 2 — SCORING                  │
│  Score de désirabilité × Compatibilité       │
├─────────────────────────────────────────────┤
│          COUCHE 3 — RANKING                  │
│  Tri du feed : activité, boost, engagement   │
├─────────────────────────────────────────────┤
│       COUCHE 4 — APPRENTISSAGE               │
│  Comportement, collaborative filtering       │
└─────────────────────────────────────────────┘
```

**Principe fondamental** : L'algorithme ne cherche pas juste à te montrer les "meilleurs" profils. Il cherche à te montrer les profils **les plus susceptibles de créer un match mutuel**, pour maximiser l'engagement.

---

## 2. Score de désirabilité

### Comment ça marche (Tinder/Bumble)

Chaque utilisateur a un **score interne dynamique** (anciennement appelé "ELO score") qui reflète sa "valeur" sur la plateforme.

#### Facteurs qui AUGMENTENT le score :
| Facteur | Impact | Détail |
|---------|--------|--------|
| Recevoir des likes | ★★★★★ | Plus tu reçois de likes, plus ton score monte |
| Likes de profils populaires | ★★★★☆ | Un like d'un profil avec un score élevé vaut plus |
| Profil complet | ★★★☆☆ | Photos de qualité + bio + intérêts |
| Activité régulière | ★★★☆☆ | Connexions quotidiennes, swipes réguliers |
| Conversations longues | ★★☆☆☆ | Les matchs qui mènent à de vraies conversations |
| Être sélectif | ★★☆☆☆ | Ne pas liker tout le monde (ratio like/dislike sain) |
| Réponses rapides | ★★☆☆☆ | Répondre vite aux messages |

#### Facteurs qui DIMINUENT le score :
| Facteur | Impact | Détail |
|---------|--------|--------|
| Swipe-all-right | ★★★★★ | Liker tout le monde = pénalité massive |
| Inactivité | ★★★★☆ | Ne pas se connecter pendant des jours |
| Pas de messages post-match | ★★★☆☆ | Matcher sans jamais écrire |
| Être souvent disliké | ★★☆☆☆ | Beaucoup de swipes gauche |
| Profil incomplet | ★★☆☆☆ | Pas de bio, 1 seule photo |
| Reports/blocks | ★★★★★ | Être signalé ou bloqué |

### Formule simplifiée

```
score_désirabilité = (
    likes_reçus × 30%
  + qualité_likes × 20%     (score moyen des personnes qui t'ont liké)
  + complétude_profil × 15%
  + activité × 15%
  + sélectivité × 10%       (ratio dislike/like — ~60/40 est idéal)
  + conversations × 10%
)
```

### Ce que fait Tinder en pratique :
- Les profils avec un score élevé sont montrés à d'autres profils avec un score élevé
- Les 10-15 premiers profils de ta session sont des profils "attractifs" (hook)
- Ton score est recalculé en continu à chaque interaction

---

## 3. Tri du feed (Queue Ordering)

### L'ordre n'est JAMAIS aléatoire

Quand un utilisateur ouvre l'app, les profils sont triés par un score composite :

```
score_feed = (
    probabilité_match_mutuel × 40%
  + score_désirabilité_autre × 20%
  + fraîcheur_profil × 15%
  + proximité_géographique × 15%
  + bonus_activité × 10%
)
```

### Règles de tri (Tinder/Bumble) :

1. **Les profils qui t'ont déjà liké** apparaissent plus tôt (mais pas tous en premier — sinon tu sais qui t'a liké)
2. **Les profils actifs** (connectés dans la dernière heure) passent avant les inactifs
3. **Les nouveaux profils** (< 48h) reçoivent un boost temporaire
4. **Les profils avec un score similaire au tien** sont priorisés
5. **Pas de répétition** — les profils déjà vus/swipés ne réapparaissent jamais
6. **Engagement hooks** — un profil très populaire est intercalé tous les 5-10 profils pour te garder motivé

### Stratégie d'engagement (anti-churn) :
- Si un user montre des signes de désengagement (swipe rapide, session courte), l'algo lui montre de "meilleurs" profils
- Si un user est sur le point de quitter, un profil qui l'a liké peut être montré pour déclencher un match

---

## 4. Score de compatibilité

### OkCupid — Le plus transparent

OkCupid utilise un système de questions avec pondération :

| Importance | Points |
|------------|--------|
| Pas important | 0 |
| Un peu important | 1 |
| Assez important | 10 |
| Très important | 50 |
| Obligatoire | 250 |

**Formule** : Moyenne géométrique de deux satisfactions :
- Combien TU satisfais les attentes de l'autre
- Combien L'AUTRE satisfait tes attentes

```
match_% = √(satisfaction_A→B × satisfaction_B→A)
```

### Meetic — Affinité psychologique

Meetic utilise un test de personnalité (15-20 questions) pour calculer un "score d'affinité" basé sur :
- Compatibilité psychologique (introversion/extraversion, valeurs, communication)
- Objectifs de vie communs
- Lifestyle match (habitudes, centres d'intérêt)

### Hinge — Engagement-based

Hinge ne montre pas de score explicite mais utilise :
- L'historique de qui tu as liké/passé
- Le type de profils avec qui tu as eu de longues conversations
- Les retours "We Met" (est-ce que le date s'est bien passé ?)

### Pour Love App — Score de compatibilité enrichi

Notre score combine les meilleures pratiques :

```
compatibility_score(A, B) = (
    intérêts_communs        × 20pts  (max)
  + objectif_relation_match × 15pts
  + critères_physiques      × 25pts  (bidirectionnel)
  + distance_géographique   × 15pts
  + activité_récente        × 10pts
  + habitudes_compatibles   × 10pts  (tabac, alcool)
  + complétude_profil       × 5pts
) / 100
```

---

## 5. Boost nouveaux utilisateurs

### Comment ça marche partout :

| App | Durée boost | Effet |
|-----|-------------|-------|
| Tinder | ~48h | Profil montré 10× plus, positionné dans le top du feed |
| Bumble | ~24-48h | Visibilité accrue + mise en avant dans le feed |
| Hinge | ~72h | Plus d'apparitions dans "Discover" |

### Pourquoi c'est crucial :
1. Le new user a besoin de recevoir des likes rapidement pour ne pas abandonner
2. L'algo a besoin de données (qui te like, qui tu likes) pour calibrer ton score
3. Le boost crée un "effet de lancement" qui définit ta position initiale dans le système

### Pour Love App :
- Profils créés < 48h → score × 1.5
- Profils créés < 24h → score × 2.0
- Premier boost gratuit (simulé) à l'inscription
- Après le boost, le score se stabilise en fonction des vraies interactions

---

## 6. Filtrage collaboratif

### Principe (Netflix pour le dating)

> "Les utilisateurs qui aiment les mêmes profils que toi aimeront probablement aussi les profils que tu n'as pas encore vus."

```
User A aime : Profil 1, Profil 3, Profil 7
User B aime : Profil 1, Profil 3, Profil 9
→ L'algo recommande Profil 7 à User B et Profil 9 à User A
```

### Comment c'est implémenté :
1. **Matrice user-profil** : Chaque swipe crée une entrée (like=1, dislike=0)
2. **Similarité entre users** : Cosine similarity entre les vecteurs de swipe
3. **Prédiction** : Pour un profil non-vu, prédire le score en fonction des users similaires
4. **Hybride** : Combiné avec le content-based filtering (critères du profil)

### Limites :
- **Cold start** : Un nouvel utilisateur n'a pas d'historique → le filtrage collaboratif ne fonctionne pas → d'où le boost + filtrage par critères
- **Bulles** : Peut créer des bulles où tu vois toujours le même "type" de personne
- **Biais** : Peut perpétuer des biais existants (race, classe sociale, etc.)

### Pour Love App (phase actuelle) :
- Pas de collaborative filtering pour le moment (pas assez de données)
- On utilise le **content-based filtering** : matching par critères (intérêts, physique, préférences)
- Le collaborative filtering sera activé quand on aura > 1000 utilisateurs actifs

---

## 7. Gale-Shapley (Hinge)

### L'algorithme du Prix Nobel

L'algorithme Gale-Shapley résout le "Problème du mariage stable" :

```
Entrée : N hommes et N femmes, chacun avec une liste de préférences ordonnée
Sortie : Un appariement stable (personne ne préfère quelqu'un d'autre qui le préfère aussi)
```

### Comment Hinge l'utilise :
1. Chaque user a une liste de "préférences" basée sur qui ils ont liké/passé
2. L'algo fait des "propositions" virtuelles
3. Un profil est "accepté" si le score de compatibilité mutuelle est élevé
4. Le résultat = la feature "Most Compatible" (1 match par jour)

### Adaptation pour Love App (futur) :
- Feature "Match du jour" : 1 profil ultra-compatible par jour
- Basé sur la compatibilité bidirectionnelle la plus élevée
- Priorité aux profils actifs qui n'ont pas encore matché

---

## 8. Signaux comportementaux

### Ce que l'algo Track (toutes les apps) :

| Signal | Ce qu'il révèle | Poids |
|--------|------------------|-------|
| Temps passé sur un profil | Intérêt réel (même sans like) | ★★★★☆ |
| Regarder toutes les photos | Fort intérêt | ★★★☆☆ |
| Lire la bio entière | Recherche sérieuse | ★★☆☆☆ |
| Vitesse de swipe | Trop rapide = pas d'attention | ★★★☆☆ |
| Revenir sur un profil | Hésitation = intérêt | ★★★★☆ |
| Premier message envoyé | Engagement réel | ★★★★★ |
| Durée des conversations | Match de qualité | ★★★★★ |
| Fréquence de connexion | User actif | ★★★☆☆ |
| Heure de connexion | Patterns d'utilisation | ★☆☆☆☆ |
| Échange de numéro | Conversion réelle | ★★★★★ |

### Pour Love App :
On track déjà :
- Swipes (like/dislike/super_like)
- Messages envoyés/reçus
- Matchs créés
- Activité (last_active_at)

À ajouter (phase 2) :
- Temps passé sur chaque profil
- Nombre de photos vues
- Durée moyenne des conversations

---

## 9. Anti-abus et qualité

### Mécanismes utilisés par les grandes apps :

| Mécanisme | Description |
|-----------|-------------|
| Limite de likes/jour | Free users : ~100 likes/jour (Tinder), force la sélectivité |
| Cooldown | Si tu likes trop vite, ralentissement artificiel du feed |
| Score de spam | Détection des comptes qui envoient le même message à tout le monde |
| Photo verification | Selfie vidéo comparé aux photos du profil |
| Report scoring | Trop de reports = shadow ban puis ban |
| Ghost detection | Comptes créés et jamais utilisés = supprimés |

### Pour Love App :
- Limite de likes par jour : 50 (free), illimité (premium futur)
- Détection swipe-all-right : ratio like > 90% → pénalité score
- Système de report existant (table `reports`)
- Vérification photo (futur)

---

## 10. Implémentation Love App

### Architecture actuelle

```sql
-- Score de compatibilité actuel (déjà déployé)
compatibility_score(user_a, user_b) → 0-100

Composantes :
├── Intérêts communs          → 25 pts max
├── Objectif relation match   → 20 pts max  
├── Distance géographique     → 20 pts max
├── Critères physiques (A↔B)  → 25 pts max
│   ├── Cheveux               → 5 pts
│   ├── Yeux                  → 4 pts
│   ├── Teint                 → 4 pts
│   ├── Silhouette            → 4 pts
│   ├── Taille                → 4 pts
│   ├── Tabac                 → 2 pts
│   └── Alcool                → 2 pts
└── Activité récente          → 10 pts max
```

### Ce qu'il faut ajouter — Phase 2

#### A. Score de désirabilité

Nouvelle table : `user_scores`

```sql
CREATE TABLE user_scores (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  desirability_score FLOAT DEFAULT 50.0,  -- 0-100
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  match_count INTEGER DEFAULT 0,
  message_sent_count INTEGER DEFAULT 0,
  avg_conversation_length FLOAT DEFAULT 0,
  profile_completeness FLOAT DEFAULT 0,   -- 0-1
  selectivity_ratio FLOAT DEFAULT 0.5,    -- likes/(likes+dislikes)
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Fonction de calcul :

```sql
desirability = (
    normalized_likes_received × 0.30
  + avg_liker_score × 0.20
  + profile_completeness × 0.15
  + activity_score × 0.15
  + selectivity_bonus × 0.10    -- optimal: 0.3-0.5
  + conversation_quality × 0.10
)
```

#### B. Feed Ordering amélioré

```sql
feed_score(viewer, candidate) = (
    compatibility_score(viewer, candidate) × 0.35
  + candidate.desirability_score × 0.20
  + new_user_boost × 0.15           -- ×2 si < 24h, ×1.5 si < 48h
  + activity_recency × 0.15         -- actif < 1h = max
  + has_liked_viewer × 0.15         -- bonus si le candidat a déjà liké le viewer
)
ORDER BY feed_score DESC
```

#### C. Anti swipe-all-right

```sql
-- Trigger après chaque swipe
IF user.selectivity_ratio > 0.90 THEN
  -- Pénalité : réduire la visibilité de 30%
  desirability_score *= 0.7
END IF
```

#### D. Limite de likes

```sql
-- Compteur journalier
daily_likes_count = COUNT(swipes WHERE swiper_id = user AND action = 'like' AND created_at > NOW() - INTERVAL '24h')

-- Limite : 50 likes gratuits / jour
IF daily_likes_count >= 50 THEN
  BLOCK swipe (montrer popup "Tu as atteint ta limite quotidienne")
END IF
```

### Roadmap algorithme

| Phase | Feature | Priorité | Complexité |
|-------|---------|----------|------------|
| ✅ Phase 1 | Compatibilité critères (intérêts + physique + distance) | Critique | Faite |
| 🔲 Phase 2A | Score de désirabilité | Haute | Moyenne |
| 🔲 Phase 2B | Feed ordering intelligent | Haute | Moyenne |
| 🔲 Phase 2C | New user boost (48h) | Haute | Simple |
| 🔲 Phase 2D | Limite de likes journalière | Moyenne | Simple |
| 🔲 Phase 2E | Anti swipe-all-right | Moyenne | Simple |
| 🔲 Phase 3A | Signaux comportementaux (temps sur profil) | Basse | Complexe |
| 🔲 Phase 3B | Collaborative filtering | Basse | Très complexe |
| 🔲 Phase 3C | "Match du jour" (Gale-Shapley) | Basse | Complexe |

---

## 11. Architecture système Tinder (référence)

Basé sur le diagramme d'architecture Tinder (Rocky Bhatia / System Design) :

```
┌──────────────────────────────────────────────────────────────┐
│                     MOBILE CLIENTS                           │
│              (iOS / Android / Web)                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   TINDER GATEWAY    │  ← API Gateway unique
              │   (Load Balancer)   │     (auth, rate limit, routing)
              └──┬──────┬──────┬───┘
                 │      │      │
         ┌───────┘      │      └────────┐
         ▼              ▼               ▼
┌─────────────┐  ┌────────────┐  ┌─────────────────┐
│RECOMMENDATION│  │  SWIPE     │  │  USER PROFILE   │
│   SERVICE    │  │  SERVICE   │  │    SEARCH       │
│              │  │            │  │                 │
│ Génère le   │  │ Enregistre │  │ CRUD profils    │
│ feed trié   │  │ les swipes │  │ + recherche     │
│ par score   │  │ like/nope  │  │                 │
└──────┬──────┘  └─────┬──────┘  └───┬─────────┬───┘
       │               │             │         │
       ▼               ▼             ▼         ▼
┌──────────┐   ┌──────────────┐  ┌────────┐ ┌───────────────┐
│ MATCHES  │   │   SWIPES     │  │STORAGE │ │ USER PROFILE  │
│ SERVICE  │   │   STREAMS    │  │(photos)│ │   DATABASE    │
└─────┬────┘   └──────┬───────┘  └────────┘ └───────────────┘
      │               │
      │     ┌─────────┘
      │     │     ┌──────────────────────┐
      │     │     │  GEOHASH INDEXER     │
      │     │     │  SERVICE             │
      │     │     │                      │
      │     │     │  Indexe les users    │
      │     │     │  par zone géo       │
      │     │     └──────────┬───────────┘
      │     │                │
      ▼     ▼                ▼
   ┌──────────────────────────────┐
   │       MATCHER WORKER         │
   │                              │
   │  Le cœur de l'algorithme :   │
   │  - Reçoit les swipes streams │
   │  - Vérifie les matchs mutuels│
   │  - Calcule les scores        │
   │  - Trie le feed              │
   └────────┬─────────┬───────────┘
            │         │
            ▼         ▼
   ┌────────────┐  ┌──────────────┐
   │  MATCHES   │  │ ENGAGEMENT   │
   │NOTIFICATION│  │   CACHE      │
   │   QUEUE    │  │              │
   │            │  │ Cache des    │
   │ Push notif │  │ scores,      │
   │ "It's a   │  │ activité,    │
   │  Match!"  │  │ feed pré-    │
   └────────────┘  │ calculé     │
                   └──────────────┘
```

### Les 6 services clés :

| Service | Rôle | Équivalent Love App |
|---------|------|---------------------|
| **Gateway** | Point d'entrée unique, auth, rate limiting | Next.js API routes + Supabase Auth |
| **Recommendation Service** | Génère le feed trié par score de compatibilité + désirabilité | Notre query discover avec `compatibility_score()` |
| **Swipe Service** | Enregistre les swipes, calcule les ratios | Table `swipes` + triggers |
| **User Profile Search** | CRUD profils, recherche par critères | Supabase `profiles` + `profile_photos` |
| **Geohash Indexer** | Index géographique pour le filtre distance | PostGIS `distance_km()` function |
| **Matcher Worker** | Détecte les matchs mutuels, envoie les notifications | Trigger `check_mutual_like` + Realtime |

### Ce que ça nous apprend pour Love App :

1. **Tout passe par un Gateway** — Chez nous c'est Next.js API routes
2. **Les swipes sont streamés** — Pas stockés et oubliés, mais analysés en continu pour recalculer les scores
3. **Le Geohash** — Tinder utilise un index géographique pour des requêtes de distance ultra-rapides (< 50ms). Nous on utilise `distance_km()` SQL qui est plus lent mais suffisant pour notre échelle
4. **L'Engagement Cache** — Le feed est **pré-calculé** et mis en cache, pas calculé à chaque ouverture. C'est ce qu'on devra faire quand on scale
5. **Le Matcher Worker est séparé** — C'est un worker background qui tourne en continu, pas un trigger synchrone. Pour l'instant notre trigger Supabase suffit

---

## Sources

- Tinder Engineering Blog — "Powering Tinder: The Method Behind Our Matching"
- Hinge — "The Gale-Shapley Algorithm" (Cornell University Analysis)
- OkCupid — "Match Question" system documentation
- Bumble — "Beehive Score" analysis (roast.dating, matchphotos.io)
- Meetic — "Affinity Test" system (seduction-efficace.com)
- Academic papers : "Dating Through the Filters" (Cambridge University)
- Technical analyses : appscrip.com, medium.com/qmind-ai, captechu.edu
