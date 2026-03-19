# Analyse Fonctionnalités Muzz — Plan d'adaptation Love App

---

## 1. TOUTES LES FONCTIONNALITÉS MUZZ

### A. Core — Matching & Discovery

| # | Feature | Description | Chez nous ? |
|---|---------|-------------|-------------|
| 1 | **Made for You** | Suggestions personnalisées basées sur les préférences (religion, valeurs, éducation, carrière) | ✅ Partiel — on a `feed_score` mais pas de "page dédiée" |
| 2 | **Profil détaillé** | Religion, secte, croyances, perspectives mariage, éducation, carrière, style vestimentaire | ❌ On n'a pas ces champs spécifiques |
| 3 | **Photos cachées** | L'user peut cacher ses photos — elles ne s'affichent que quand il le décide | ❌ |
| 4 | **Pseudonymes** | Possibilité d'utiliser un pseudo au lieu de son vrai prénom | ❌ |

### B. Communication

| # | Feature | Description | Chez nous ? |
|---|---------|-------------|-------------|
| 5 | **Chat texte** | Messagerie classique après match | ✅ |
| 6 | **Instant Chat** | Envoyer un message AVANT le match (1 gratuit/mois, 1/jour pour Gold) | ❌ |
| 7 | **Appel vocal in-app** | Appeler son match sans donner son numéro | ❌ |
| 8 | **Appel vidéo in-app** | Même chose en vidéo | ❌ |
| 9 | **Video Notes** | Messages vidéo courts (comme les vocaux mais en vidéo) | ❌ |
| 10 | **Photos dans le chat** | Envoyer des images en conversation | ✅ |
| 11 | **Messages vocaux** | Enregistrer et envoyer des vocaux | ✅ |

### C. Sécurité & Vérification

| # | Feature | Description | Chez nous ? |
|---|---------|-------------|-------------|
| 12 | **Selfie Verification** | Selfie en live comparé aux photos du profil (anti-catfish) | ❌ |
| 13 | **ID Verification** | Scan passeport/permis → badge bleu vérifié | ❌ |
| 14 | **Anti-screenshot** | Impossible de screenshot/screen-record les photos | ❌ |
| 15 | **Détection nudité** | IA qui détecte et supprime les images nues automatiquement | ❌ |
| 16 | **Signalement** | Système de report | ✅ Table `reports` existe |

### D. Confidentialité

| # | Feature | Description | Chez nous ? |
|---|---------|-------------|-------------|
| 17 | **Mode Invisible** | Ton profil n'apparaît QUE pour les personnes que tu as likées | ❌ |
| 18 | **Chaperon** | Un tiers (parent, ami) peut lire les conversations en lecture seule | ❌ |
| 19 | **Blocage** | Bloquer un utilisateur | ❌ |

### E. Premium (Gold)

| # | Feature | Description | Chez nous ? |
|---|---------|-------------|-------------|
| 20 | **Likes illimités** | Pas de limite quotidienne | ✅ Partiel — on a la limite 50/jour |
| 21 | **Voir qui t'a liké** | Liste de tous les profils qui t'ont liké | ❌ |
| 22 | **Boost profil** | Pousser son profil en haut du feed pendant X heures | ❌ |
| 23 | **Filtres avancés** | Filtrer par critères très précis (éducation, travail, etc.) | ❌ |
| 24 | **Recherche prioritaire** | Ton profil apparaît avant les autres | ❌ |

### F. Social & Events

| # | Feature | Description | Chez nous ? |
|---|---------|-------------|-------------|
| 25 | **Événements IRL** | Singles nights, speed dating, iftars organisés par Muzz | ❌ Hors scope |
| 26 | **Speed Dating in-app** | Appels courts programmés avec des matchs potentiels | ❌ |
| 27 | **Muzz Social** | Groupes de discussion par intérêt / ville / thème | ❌ Hors scope |

---

## 2. FEATURES SÉLECTIONNÉES POUR LOVE APP

### Ce qu'on implémente (réaliste pour la démo) :

| Priorité | Feature | Impact client | Complexité |
|----------|---------|---------------|------------|
| 🔴 P0 | **Voir qui t'a liké** | Très fort — feature premium classique | Moyenne |
| 🔴 P0 | **Boost profil** | Fort — monetization + engagement | Simple |
| 🔴 P0 | **Mode Invisible** | Fort — confidentialité | Moyenne |
| 🟡 P1 | **Instant Chat** (message avant match) | Fort — différenciateur | Moyenne |
| 🟡 P1 | **Appel vocal in-app** | Fort — engagement | Complexe |
| 🟡 P1 | **Selfie Verification** (badge vérifié) | Fort — confiance | Simple (UI only) |
| 🟡 P1 | **Anti-screenshot** | Moyen — sécurité | Simple |
| 🟢 P2 | **Blocage utilisateur** | Moyen — basique | Simple |
| 🟢 P2 | **Video Notes** | Moyen — fun | Complexe |
| 🟢 P2 | **Chaperon** | Moyen — niche | Moyenne |
| ⚪ P3 | **Appel vidéo in-app** | Fort mais très complexe | Très complexe (WebRTC) |
| ⚪ P3 | **Événements** | Hors scope démo | — |

---

## 3. PLAN D'IMPLÉMENTATION

### Phase A — "Qui t'a liké" + Boost + Mode Invisible

#### A1. Page "Qui t'a liké"
- **Nouvelle page** : `/likes` (nouvel onglet dans la BottomNav)
- Query : `SELECT * FROM swipes WHERE swiped_id = me AND action = 'like' AND swiper_id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = me)`
- Affiche les profils qui t'ont liké mais que tu n'as pas encore vu
- Photos floutées par défaut (sauf premium futur)
- Tap sur un profil flouté → like direct (match instantané)
- **UI** : Grille 2 colonnes de cartes avec photo + prénom + âge

#### A2. Boost profil
- **Bouton Boost** sur la page Discover (icône ⚡)
- Quand activé : `UPDATE user_scores SET new_user_boost = 3.0, boost_expires_at = NOW() + INTERVAL '1 hour'`
- Le `feed_score` utilise déjà le boost → le profil remonte automatiquement
- Limite : 1 boost gratuit / semaine
- Table `boosts` : `user_id, activated_at, expires_at`
- **UI** : Bouton ⚡ avec compteur "1 boost dispo" + animation activation

#### A3. Mode Invisible
- **Toggle** dans les paramètres profil
- Nouveau champ : `profiles.invisible_mode BOOLEAN DEFAULT false`
- Quand activé : le profil n'apparaît dans le feed QUE pour les personnes qu'il a likées
- Modifier la query Discover : `AND (candidate.invisible_mode = false OR EXISTS (SELECT 1 FROM swipes WHERE swiper_id = candidate.id AND swiped_id = viewer.id AND action = 'like'))`
- **UI** : Toggle dans profil avec explication "Seules les personnes que tu likes peuvent te voir"

### Phase B — Instant Chat + Verification badge + Anti-screenshot

#### B1. Instant Chat (message avant match)
- Bouton "Envoyer un message" sur le profil expandable (ProfileDetail)
- Crée un "pending_chat" : message envoyé sans match
- Le destinataire voit le message dans une section "Demandes" dans Matchs
- S'il accepte → match créé automatiquement + conversation ouverte
- Table `chat_requests` : `sender_id, receiver_id, message, status (pending/accepted/rejected), created_at`
- Limite : 1 gratuit / jour
- **UI** : Bulle de message sur le profil + section "Demandes" avec accept/reject

#### B2. Badge vérifié (Selfie)
- **Flow** : Prendre un selfie → upload → comparaison (simulée pour la démo)
- Nouveau champ : `profiles.is_verified BOOLEAN` (existe déjà !)
- Page `/profile/verify` : caméra selfie + instructions "Tournez la tête à gauche, à droite"
- Pour la démo : on valide automatiquement → badge bleu sur le profil
- **UI** : Badge ✓ bleu à côté du prénom partout (SwipeCard, MatchCard, conversation header)

#### B3. Anti-screenshot
- CSS : `user-select: none` + `-webkit-touch-callout: none` sur les photos
- JS : Listener `visibilitychange` pour masquer les photos quand l'app passe en arrière-plan
- Meta tag : `<meta name="apple-mobile-web-app-capable">` (déjà fait)
- **Note** : Sur le web, c'est impossible de bloquer à 100% les screenshots. Mais on peut rendre ça plus difficile.

### Phase C — Blocage + Appels vocaux

#### C1. Blocage utilisateur
- Table `blocks` : `blocker_id, blocked_id, created_at`
- Modifier toutes les queries (discover, matchs, messages) pour exclure les utilisateurs bloqués
- Bouton "Bloquer" dans le menu profil/conversation
- **UI** : Option dans le header de conversation (⋯ → Bloquer)

#### C2. Appels vocaux in-app
- Utiliser **WebRTC** via Supabase Realtime pour le signaling
- Flow : Bouton 📞 dans le header conversation → envoi offre → l'autre reçoit une notification → accepte → connexion peer-to-peer
- Table `call_signals` : pour le signaling ICE/SDP
- **UI** : Écran d'appel plein écran avec avatar + durée + boutons mute/hangup
- **Complexité** : C'est le plus dur. Nécessite ICE servers (STUN/TURN).

---

## 4. RÉSUMÉ VISUEL — CE QUI CHANGE DANS L'APP

### Nouvelles pages :
- `/likes` — Qui t'a liké (grille floutée)
- `/profile/verify` — Vérification selfie
- `/profile/settings` — Mode invisible + préférences

### Modifications existantes :
- **BottomNav** : Ajouter onglet "Likes" (icône cœur avec badge compteur)
- **Discover** : Bouton Boost ⚡
- **ProfileDetail** : Bouton "Instant Chat" + badge vérifié
- **SwipeCard** : Badge vérifié ✓
- **Conversation header** : Bouton appel 📞 + menu ⋯ (bloquer/signaler)
- **Matchs page** : Section "Demandes de message" en haut

### Nouvelles tables DB :
- `boosts` — Historique des boosts
- `chat_requests` — Messages avant match
- `blocks` — Utilisateurs bloqués
- `call_signals` — Signaling WebRTC (phase C)

### Modifications DB :
- `profiles` : Ajouter `invisible_mode BOOLEAN DEFAULT false`
- `user_scores` : Utiliser `new_user_boost` pour les boosts manuels
