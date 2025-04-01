document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments DOM (inchangés) ---
    const modeWeightRadio = document.querySelector('input[name="mode"][value="weight"]');
    const modeStarterRadio = document.querySelector('input[name="mode"][value="starter"]');
    const finalWeightInput = document.getElementById('finalWeight');
    const starterAmountInput = document.getElementById('starterAmount');
    const starterStateSelect = document.getElementById('starterState');
    const ambientTempInput = document.getElementById('ambientTemp');
    const fridgeProofCheckbox = document.getElementById('fridgeProof');
    const addInsCheckbox = document.getElementById('addIns');
    const calcFromEndRadio = document.querySelector('input[name="calcDirection"][value="from_end"]');
    const calcFromStartRadio = document.getElementById('calcFromStartRadio');
    const fromStartLabel = document.getElementById('from_start_label');
    const fromStartNote = document.getElementById('from_start_note');
    const bakeEndTimeInput = document.getElementById('bakeEndTime');
    const refresh1StartTimeInput = document.getElementById('refresh1StartTime');

    const weightInputGroup = document.getElementById('weight-input-group');
    const starterInputGroup = document.getElementById('starter-input-group');
    const starterStateGroup = document.getElementById('starter-state-group');

    const estimatedWeightResult = document.getElementById('estimated-weight-result');
    const estimatedWeightP = document.getElementById('estimatedWeight');
    const levainIngredientsResult = document.getElementById('ingredients-levain-result');
    const levainIngredientsList = document.getElementById('levainIngredientsList');
    const painIngredientsList = document.getElementById('painIngredientsList');
    const calculatedTimeResult = document.getElementById('calculated-time-result');
    const calculatedTimeKey = document.getElementById('calculatedTimeKey');
    const calculatedTimeValue = document.getElementById('calculatedTimeValue');
    const scheduleBasis = document.getElementById('scheduleBasis');
    const scheduleList = document.getElementById('scheduleList');

    // --- Constantes & Recette de Base (inchangées) ---
    const BAKE_LOSS = 0.15;
    const BASE_LEVAIN_PERCENT = 0.24;
    const BASE_FLOUR_PERCENT = 0.475;
    const BASE_WATER_PERCENT = 0.275;
    const BASE_SALT_PERCENT = 0.01;
    const ADDINS_PERCENT_OF_FLOUR = 0.10;
    const FEED_RATIO_MOTHER = 1;
    const FEED_RATIO_WATER = 1;
    const FEED_RATIO_FLOUR = 1;
    const FEED_TOTAL_PARTS = FEED_RATIO_MOTHER + FEED_RATIO_WATER + FEED_RATIO_FLOUR;
    const FEED_TIME_25C = 6;
    const FEED_TIME_19C = 8;
    const FERMENT_TIME_25C = 3.5;
    const FERMENT_TIME_19C = 4.5;
    const COLD_STARTER_EXTRA_HOURS = 2;
    const REFRESH_INTERVAL_HOURS = 12;
    const FRIDGE_PROOF_HOURS = 16;
    const AMBIENT_PROOF_HOURS = 1;
    const SHAPING_MINUTES = 15;
    const KNEADING_MINUTES = 30;
    const BAKING_MINUTES = 35;

    // --- Fonctions Utilitaires ---
    const formatGrams = (grams) => Math.round(grams);
    const formatTime = (hours) => {
        if (hours == null || isNaN(hours) || hours <= 0) return '';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        let parts = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${String(m).padStart(2, '0')}min`);
        return parts.join(' ');
    };

    const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return { input: "", display: "Date invalide" };
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const dateStringForInput = `${year}-${month}-${day}T${hours}:${minutes}`;
        const displayString = date.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return { input: dateStringForInput, display: displayString };
    };

    // --- CORRIGÉ : Fonction formatRelativeTime ---
    const formatRelativeTime = (targetDate, bakeEndDate) => {
        if (!targetDate || !bakeEndDate || isNaN(targetDate.getTime()) || isNaN(bakeEndDate.getTime())) return "";

        // Utiliser une petite tolérance pour la comparaison
        if (Math.abs(targetDate.getTime() - bakeEndDate.getTime()) < 1000) {
             return "(Cuisson terminée)";
        }

        const diffMillis = bakeEndDate.getTime() - targetDate.getTime();
        const totalMinutesDiff = Math.round(diffMillis / 60000); // Différence totale en minutes

        if (totalMinutesDiff <= 0) return ""; // Ne devrait pas arriver si bakeEndDate est la référence finale

        const days = Math.floor(totalMinutesDiff / (60 * 24));
        const remainingMinutesAfterDays = totalMinutesDiff % (60 * 24);
        const hours = Math.floor(remainingMinutesAfterDays / 60);
        const minutes = remainingMinutesAfterDays % 60;

        let relativeParts = [];
        if (days > 0) relativeParts.push(`J-${days}`);
        if (hours > 0) relativeParts.push(`${hours}h`);
        if (minutes > 0) relativeParts.push(`${minutes}min`);

        if (relativeParts.length === 0) return ""; // Si moins d'une minute avant

        return `(${relativeParts.join(' ')} avant)`;
    };


    const interpolateTime = (temp, time19C, time25C) => {
        const tempClamped = Math.max(19, Math.min(25, temp));
        if (tempClamped <= 19) return time19C;
        if (tempClamped >= 25) return time25C;
        return time19C + ((time25C - time19C) / (25 - 19)) * (tempClamped - 19);
    };

    // Renommage pour clarté : retourne une *nouvelle* date
    const addMinutesToDate = (date, minutes) => new Date(date.getTime() + minutes * 60000);
    const addHoursToDate = (date, hours) => new Date(date.getTime() + hours * 3600000);
    const subtractMinutesFromDate = (date, minutes) => new Date(date.getTime() - minutes * 60000);
    const subtractHoursFromDate = (date, hours) => new Date(date.getTime() - hours * 3600000);

    // --- Fonction pour gérer l'activation du mode "Planif depuis début" (inchangée) ---
     const checkEnableCalcFromStart = () => {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const starterState = starterStateSelect.value;
        const canEnable = mode === 'weight' && starterState === 'fridge_long';
        calcFromStartRadio.disabled = !canEnable;
        fromStartLabel.style.color = canEnable ? '' : '#999';
        fromStartNote.style.display = canEnable ? 'none' : 'block';
        if (!canEnable && calcFromStartRadio.checked) {
            calcFromEndRadio.checked = true;
            calcFromEndRadio.dispatchEvent(new Event('change'));
        }
    };

    // --- Fonction Principale de Mise à Jour ---
    const updateApp = () => {
        checkEnableCalcFromStart();

        // 1. Lire les inputs (inchangé)
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const finalWeight = parseFloat(finalWeightInput.value) || 1000;
        const starterAmount = parseFloat(starterAmountInput.value) || 240;
        const starterState = mode === 'weight' ? starterStateSelect.value : null;
        const ambientTemp = parseFloat(ambientTempInput.value) || 22;
        const useFridgeProof = fridgeProofCheckbox.checked;
        const useAddIns = addInsCheckbox.checked;
        const calcDirection = document.querySelector('input[name="calcDirection"]:checked').value;
        const bakeEndTimeStr = bakeEndTimeInput.value;
        const refresh1StartTimeStr = refresh1StartTimeInput.value;

        // Gérer la visibilité et l'état activé/désactivé (inchangé)
        weightInputGroup.style.display = mode === 'weight' ? 'block' : 'none';
        starterInputGroup.style.display = mode === 'starter' ? 'block' : 'none';
        starterStateGroup.style.display = mode === 'weight' ? 'block' : 'none';
        estimatedWeightResult.style.display = mode === 'starter' ? 'block' : 'none';
        levainIngredientsResult.style.display = mode === 'weight' ? 'block' : 'none';
        bakeEndTimeInput.disabled = (calcDirection === 'from_start');
        refresh1StartTimeInput.disabled = (calcDirection === 'from_end') || !(mode === 'weight' && starterState === 'fridge_long');

        // Déterminer la date de référence et la direction
        let referenceDateStr, isPlanningForward = false;
        if (calcDirection === 'from_start' && mode === 'weight' && starterState === 'fridge_long') {
            referenceDateStr = refresh1StartTimeStr;
            isPlanningForward = true;
        } else {
            referenceDateStr = bakeEndTimeStr;
            isPlanningForward = false;
        }

        // Validation de la date de référence
        if (!referenceDateStr) {
            scheduleList.innerHTML = `<li>Veuillez sélectionner une date et heure de ${isPlanningForward ? 'début' : 'fin'}.</li>`;
            // Vider les autres sections aussi...
            painIngredientsList.innerHTML = '<li>...</li>';
            levainIngredientsList.innerHTML = '<li>...</li>';
            estimatedWeightP.textContent = `--- g`;
            calculatedTimeValue.textContent = '---';
            return;
        }
        const referenceDate = new Date(referenceDateStr);
        if (isNaN(referenceDate.getTime())) {
            scheduleList.innerHTML = `<li>Date et heure de ${isPlanningForward ? 'début' : 'fin'} invalides.</li>`;
            calculatedTimeValue.textContent = 'Date invalide';
            return;
        }

        // 2. Calculer les Quantités (inchangé)
        // ... (même code que précédemment) ...
        let requiredLevain, flourAmount, waterAmount, saltAmount, addInsAmount = 0, targetDoughWeight;
         if (mode === 'weight') { targetDoughWeight = finalWeight / (1 - BAKE_LOSS); requiredLevain = targetDoughWeight * BASE_LEVAIN_PERCENT; flourAmount = targetDoughWeight * BASE_FLOUR_PERCENT; waterAmount = targetDoughWeight * BASE_WATER_PERCENT; saltAmount = targetDoughWeight * BASE_SALT_PERCENT; estimatedWeightP.textContent = `--- g`; } else { requiredLevain = starterAmount; targetDoughWeight = requiredLevain / BASE_LEVAIN_PERCENT; flourAmount = targetDoughWeight * BASE_FLOUR_PERCENT; waterAmount = targetDoughWeight * BASE_WATER_PERCENT; saltAmount = targetDoughWeight * BASE_SALT_PERCENT; const estimatedFinalWeight = targetDoughWeight * (1 - BAKE_LOSS); estimatedWeightP.textContent = `${formatGrams(estimatedFinalWeight)} g`; } if (useAddIns) { addInsAmount = flourAmount * ADDINS_PERCENT_OF_FLOUR; }


        // 3. Calculer les Ingrédients du Levain (inchangé)
        // ... (même code que précédemment) ...
         levainIngredientsList.innerHTML = ''; if (mode === 'weight') { const feedFlour = requiredLevain * (FEED_RATIO_FLOUR / FEED_TOTAL_PARTS); const feedWater = requiredLevain * (FEED_RATIO_WATER / FEED_TOTAL_PARTS); let motherLevainNeeded = requiredLevain * (FEED_RATIO_MOTHER / FEED_TOTAL_PARTS); if (starterState === 'fridge_long') { const initialMotherForRefresh1 = motherLevainNeeded / (FEED_TOTAL_PARTS * FEED_TOTAL_PARTS); const flourForRefresh1 = initialMotherForRefresh1 * FEED_RATIO_FLOUR; const waterForRefresh1 = initialMotherForRefresh1 * FEED_RATIO_WATER; const totalRefresh1 = initialMotherForRefresh1 * FEED_TOTAL_PARTS; const flourForRefresh2 = totalRefresh1 * FEED_RATIO_FLOUR; const waterForRefresh2 = totalRefresh1 * FEED_RATIO_WATER; levainIngredientsList.innerHTML = `<li><strong>Rafraîchi 1 :</strong></li><li>   ${formatGrams(initialMotherForRefresh1)} g Levain Mère (du frigo)</li><li>   ${formatGrams(waterForRefresh1)} g Eau</li><li>   ${formatGrams(flourForRefresh1)} g Farine (totale)</li><li><strong>Rafraîchi 2 :</strong></li><li>   ${formatGrams(totalRefresh1)} g Levain du R1</li><li>   ${formatGrams(waterForRefresh2)} g Eau</li><li>   ${formatGrams(flourForRefresh2)} g Farine (totale)</li><li><strong>Nourrissage Final :</strong></li><li>   ${formatGrams(motherLevainNeeded)} g Levain du R2</li><li>   ${formatGrams(feedWater)} g Eau</li><li>   ${formatGrams(feedFlour)} g Farine (totale)</li><li><em>Total Levain "tout point" obtenu: ${formatGrams(requiredLevain)} g</em></li>`; } else { levainIngredientsList.innerHTML = `<li><strong>Nourrissage Final :</strong></li><li>   ${formatGrams(motherLevainNeeded)} g Levain Mère ${starterState === 'fridge_short' ? '(du frigo <7j)' : '(frais)'}</li><li>   ${formatGrams(feedWater)} g Eau</li><li>   ${formatGrams(feedFlour)} g Farine (totale)</li><li><em>Total Levain "tout point" obtenu: ${formatGrams(requiredLevain)} g</em></li>`; } }


        // 4. Afficher les Ingrédients du Pain (inchangé)
        // ... (même code que précédemment) ...
        painIngredientsList.innerHTML = `<li><strong>${formatGrams(requiredLevain)} g</strong> Levain "tout point"</li><li><strong>${formatGrams(flourAmount)} g</strong> Farine</li><li><strong>${formatGrams(waterAmount)} g</strong> Eau</li><li><strong>${formatGrams(saltAmount)} g</strong> Sel</li>${useAddIns ? `<li><strong>${formatGrams(addInsAmount)} g</strong> Graines / Fruits secs</li>` : ''}<li><em>Poids total pâte approx.: ${formatGrams(targetDoughWeight + (useAddIns ? addInsAmount : 0))} g</em></li>`;


        // 5. Calculer le Planning - Logique Révisée
        const schedule = [];
        let calculatedEndpointDate; // Pour l'autre bout du planning
        let finalBakeEndTime; // Gardera toujours l'heure de fin de cuisson

        // Définir toutes les étapes potentielles AVEC leurs durées (en heures)
        const allSteps = [];
        // --- Levain (si besoin) ---
        if (mode === 'weight') {
            let feedTimeHours = interpolateTime(ambientTemp, FEED_TIME_19C, FEED_TIME_25C);
            if (starterState === 'fridge_short') feedTimeHours += COLD_STARTER_EXTRA_HOURS;

            if (starterState === 'fridge_long') {
                let refreshTimeHours = interpolateTime(ambientTemp, FEED_TIME_19C, FEED_TIME_25C);
                allSteps.push({ id: 'get_starter', duration: 0, label: "Sortir le levain mère du frigo" });
                allSteps.push({ id: 'refresh1', duration: refreshTimeHours, label: `Rafraîchi #1 (${formatTime(refreshTimeHours)} @${ambientTemp}°C)` });
                allSteps.push({ id: 'rest1', duration: REFRESH_INTERVAL_HOURS, label: `Repos après Rafraîchi #1 (${formatTime(REFRESH_INTERVAL_HOURS)})` });
                allSteps.push({ id: 'refresh2', duration: refreshTimeHours, label: `Rafraîchi #2 (${formatTime(refreshTimeHours)} @${ambientTemp}°C)` });
                 allSteps.push({ id: 'feed', duration: feedTimeHours, label: `Nourrissage Final (${formatTime(feedTimeHours)} @${ambientTemp}°C)` });
            } else {
                allSteps.push({ id: 'get_starter', duration: 0, label: "Sortir/Préparer le levain mère" });
                allSteps.push({ id: 'feed', duration: feedTimeHours, label: `Nourrissage Final (${formatTime(feedTimeHours)} @${ambientTemp}°C${starterState === 'fridge_short' ? ' +2h frigo' : ''})` });
            }
        } else {
             allSteps.push({ id: 'prepare', duration: 0, label: "Préparer les ingrédients (levain déjà prêt)" });
        }
        // --- Pain ---
        const fermentationTimeHours = interpolateTime(ambientTemp, FERMENT_TIME_19C, FERMENT_TIME_25C);
        const proofTimeHours = useFridgeProof ? FRIDGE_PROOF_HOURS : AMBIENT_PROOF_HOURS;
        allSteps.push({ id: 'knead', duration: KNEADING_MINUTES / 60, label: "Pétrissage" });
        allSteps.push({ id: 'ferment', duration: fermentationTimeHours, label: `Fermentation (${formatTime(fermentationTimeHours)} @${ambientTemp}°C)` });
        allSteps.push({ id: 'shape', duration: SHAPING_MINUTES / 60, label: "Façonnage" });
        allSteps.push({ id: 'proof', duration: proofTimeHours, label: `Pousse Finale (${useFridgeProof ? 'au frigo' : 'ambiante'})` });
        allSteps.push({ id: 'bake', duration: BAKING_MINUTES / 60, label: "Cuisson (four préchauffé)" });
        allSteps.push({ id: 'end', duration: 0, label: "FIN Cuisson & Début Refroidissement"}); // Étape finale


        // --- Calcul des temps ---
        if (isPlanningForward) {
            // Calcul en avant
            let currentStartTime = referenceDate; // Commence au début du 1er rafraîchi
            finalBakeEndTime = referenceDate; // Va être mis à jour

            allSteps.forEach(step => {
                schedule.push({ action: step.label, time: currentStartTime });
                // Calcule la fin de cette étape (qui est le début de la suivante)
                currentStartTime = addHoursToDate(currentStartTime, step.duration);
            });
            // La dernière valeur de currentStartTime est l'heure de fin de cuisson
            finalBakeEndTime = currentStartTime;
            calculatedEndpointDate = finalBakeEndTime;

            // Mettre à jour l'affichage
            scheduleBasis.textContent = `(Basé sur l'heure de début du 1er rafraîchi)`;
            bakeEndTimeInput.value = formatDate(finalBakeEndTime).input;
            calculatedTimeResult.style.display = 'block';
            calculatedTimeKey.textContent = 'Heure de fin de cuisson (calculée) :';
            calculatedTimeValue.textContent = formatDate(finalBakeEndTime).display;

        } else {
            // Calcul en arrière (par défaut)
            let currentEndTime = referenceDate; // Commence à la fin de la cuisson
            finalBakeEndTime = referenceDate; // Référence fixe pour le calcul relatif
            calculatedEndpointDate = referenceDate; // Sera mis à jour avec le début

            // Itérer sur les étapes en ordre inverse
            const reversedSteps = [...allSteps].reverse();

            reversedSteps.forEach(step => {
                 // Le temps associé à l'étape est son heure de DEBUT
                 // On la calcule en SOUSTRAYANT la durée de l'heure de FIN (currentEndTime)
                 let startTime = subtractHoursFromDate(currentEndTime, step.duration);
                 schedule.push({ action: step.label, time: startTime });
                 // L'heure de fin de l'étape PRECEDENTE (dans l'ordre chrono) est l'heure de début de celle-ci
                 currentEndTime = startTime;
            });

            calculatedEndpointDate = currentEndTime; // Heure de début de la toute première étape

            // Mettre à jour l'affichage
            scheduleBasis.textContent = `(Basé sur l'heure de fin de cuisson)`;
             if (mode === 'weight' && starterState === 'fridge_long') {
                 refresh1StartTimeInput.value = formatDate(calculatedEndpointDate).input;
                 calculatedTimeResult.style.display = 'block';
                 calculatedTimeKey.textContent = 'Heure de début du 1er rafraîchi (calculée) :';
                 calculatedTimeValue.textContent = formatDate(calculatedEndpointDate).display;
             } else {
                  calculatedTimeResult.style.display = 'none';
                  calculatedTimeValue.textContent = '---';
             }
        }

        // 6. Afficher le Planning
        scheduleList.innerHTML = ''; // Vider l'ancien planning
        // Trier par ordre chronologique car l'ajout arrière ne garantit pas l'ordre parfait si durées nulles
        schedule.sort((a, b) => a.time - b.time);

        // Filtrer les doublons potentiels (étapes à durée nulle) avant affichage
        const uniqueSchedule = [];
        const seenTimes = new Set();

        schedule.forEach(step => {
             // Pour l'étape finale, on utilise finalBakeEndTime qui est toujours correct
             const stepTime = (step.action === allSteps.find(s => s.id === 'end').label) ? finalBakeEndTime : step.time;

            // Ignorer si heure invalide
             if (isNaN(stepTime.getTime())) return;

             // Générer une clé unique pour heure+action pour éviter doublons exacts
             const timeActionKey = stepTime.getTime() + "_" + step.action;
             if (!seenTimes.has(timeActionKey)) {
                  uniqueSchedule.push({ ...step, time: stepTime }); // Utiliser l'heure corrigée
                  seenTimes.add(timeActionKey);
             }
        });


        uniqueSchedule.forEach(step => {
            const li = document.createElement('li');

            const actionSpan = document.createElement('span');
            actionSpan.className = 'action';
            actionSpan.textContent = step.action;

            const absoluteTimeSpan = document.createElement('span');
            absoluteTimeSpan.className = 'time-absolute';
            absoluteTimeSpan.textContent = formatDate(step.time).display; // Afficher l'heure de début de l'étape

            const relativeTimeSpan = document.createElement('span');
            relativeTimeSpan.className = 'time-relative';
            // Le temps relatif est TOUJOURS calculé par rapport à l'heure de FIN de cuisson
            relativeTimeSpan.textContent = formatRelativeTime(step.time, finalBakeEndTime);

            li.appendChild(actionSpan);
            li.appendChild(absoluteTimeSpan);
            li.appendChild(relativeTimeSpan);
            scheduleList.appendChild(li);
        });
    };

    // --- Écouteurs d'événements (inchangés) ---
    modeWeightRadio.addEventListener('change', updateApp);
    modeStarterRadio.addEventListener('change', updateApp);
    finalWeightInput.addEventListener('input', updateApp);
    starterAmountInput.addEventListener('input', updateApp);
    starterStateSelect.addEventListener('change', updateApp);
    ambientTempInput.addEventListener('input', updateApp);
    fridgeProofCheckbox.addEventListener('change', updateApp);
    addInsCheckbox.addEventListener('change', updateApp);
    calcFromEndRadio.addEventListener('change', updateApp);
    calcFromStartRadio.addEventListener('change', updateApp);
    bakeEndTimeInput.addEventListener('change', updateApp);
    refresh1StartTimeInput.addEventListener('change', updateApp);

    // --- Initialisation (inchangée) ---
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    bakeEndTimeInput.value = formatDate(tomorrow).input;
    const todayEvening = new Date();
    todayEvening.setHours(18,0,0,0);
    if(todayEvening < new Date()) { todayEvening.setDate(todayEvening.getDate() + 1); todayEvening.setHours(8,0,0,0); }
    refresh1StartTimeInput.value = formatDate(todayEvening).input;
    updateApp(); // Calcul initial
});