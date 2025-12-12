// CSV DATA - Přímo z dat
const csvMec = `jméno
Honza Sax
Roman Král
Radek Vyskočil
Josef Rydlo
Pan Mori
Václav Hutník
Novotný Radek 
Petr Erlebach
Ondra Novák
Petr Ospálek 
David Smyk Vorel
Vít Hrachový
Dan Bělina 
Daniel Kocur
Ondřej Paprskář 
Matěj Palka`;

const csvMecStit = `jméno
Dan Bělina 
Petr Ospálek 
Petr Erlebach
Jan Winzig
Václav Hutník
Vít Hrachový
Ondřej Paprskář 
Josef Rydlo
Jan Zajíc
Roman Král
Matěj Palka
David Smyk Vorel
Honza Sax
Daniel Kocur
Novotný Radek 
Apollinaire`;

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_NAMES = {
    red: 'Červená',
    blue: 'Modrá',
    green: 'Zelená',
    yellow: 'Žlutá'
};

let tournamentData = {
    players: [],
    discipline1: null,
    discipline2: null,
    winners: { 0: null, 1: null } // Vítězové finále (0 = Meč, 1 = Meč + Štít)
};

// PARSOVÁNÍ CSV
function parseCSV(csvData, disciplineIndex) {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return []; // Kontrola, jestli jsou data

    const players = [];

    for (let i = 1; i < lines.length; i++) {
        const name = lines[i].trim();

        if (name) {
            players.push({
                id: i,
                name: name,
                discipline1: disciplineIndex === 0,
                discipline2: disciplineIndex === 1
            });
        }
    }

    return players;
}

// NAČTENÍ DAT Z LOCALSTORAGE
function loadData() {
    const saved = localStorage.getItem('tournamentData');
    if (saved) {
        tournamentData = JSON.parse(saved);
        // Zajisti, že winners vlastnost existuje (kompatibilita se starými daty)
        if (!tournamentData.winners) {
            tournamentData.winners = { 0: null, 1: null };
        }
    } else {
        initTournament();
    }
    render();
}

// INICIALIZACE TURNAJE
function initTournament() {
    const players1 = parseCSV(csvMec, 0); // Meč
    const players2 = parseCSV(csvMecStit, 1); // Meč + Štít

    // Slouč hráče - pokud se objeví v obou CSV, měl by být s oběma disciplínami
    const allPlayersMap = {};

    players1.forEach(p => {
        if (!allPlayersMap[p.name]) {
            allPlayersMap[p.name] = { ...p };
        } else {
            allPlayersMap[p.name].discipline1 = true;
        }
    });

    players2.forEach(p => {
        if (!allPlayersMap[p.name]) {
            allPlayersMap[p.name] = { ...p };
        } else {
            allPlayersMap[p.name].discipline2 = true;
        }
    });

    const allPlayers = Object.values(allPlayersMap).map((p, idx) => ({
        ...p,
        id: idx + 1 // Přiřaď konsistentní ID
    }));

    tournamentData.players = allPlayers;

    // Filtruj hráče pro každou disciplínu
    const discipline1Players = allPlayers.filter(p => p.discipline1);
    const discipline2Players = allPlayers.filter(p => p.discipline2);

    tournamentData.discipline1 = createDiscipline(discipline1Players, 'Meč');
    tournamentData.discipline2 = createDiscipline(discipline2Players, 'Meč + Štít');

    saveData();
}

// NÁHODNÉ MÍCHÁNÍ POLE
function shuffleArray(array) {
    const arr = [...array];
    // for (let i = arr.length - 1; i > 0; i--) {
    //     const j = Math.floor(Math.random() * (i + 1));
    //     [arr[i], arr[j]] = [arr[j], arr[i]];
    // }
    return arr;
}

// VYTVOŘENÍ DISCIPLÍNY SE SKUPINAMI
function createDiscipline(players, name) {
    const groups = [];
    const colors = ['red', 'blue', 'green', 'yellow'];

    // Náhodné míchání hráčů
    const shuffledPlayers = shuffleArray(players);

    // Rozdělení do 4 skupin po 4 lidech - postupně
    for (let i = 0; i < 4; i++) {
        const groupPlayers = [];
        for (let j = 0; j < 4; j++) {
            const playerIdx = i * 4 + j;
            if (playerIdx < shuffledPlayers.length) {
                groupPlayers.push(shuffledPlayers[playerIdx]);
            }
        }

        const group = {
            id: i + 1,
            players: groupPlayers.map((p, idx) => ({
                id: p.id,
                name: p.name,
                color: colors[idx],
                originalColor: p.color
            }))
        };

        // Vytvoření zápasů: každá barva s každou (6 zápasů)
        // Seřazeno aby se stejné barvy neopakovaly hned za sebou
        const matches = [];
        for (let j = 0; j < groupPlayers.length; j++) {
            for (let k = j + 1; k < groupPlayers.length; k++) {
                matches.push({
                    j, k,
                    player1Id: groupPlayers[j].id,
                    player1Name: groupPlayers[j].name,
                    player1Color: colors[j],
                    player2Id: groupPlayers[k].id,
                    player2Name: groupPlayers[k].name,
                    player2Color: colors[k],
                    score1: 0,
                    score2: 0,
                    points1: 0,
                    points2: 0,
                    winner: null
                });
            }
        }

        // Optimalizované seřazení - minimalizuje opakování hráčů za sebou
        const orderedMatches = [];
        const remainingMatches = [...matches];

        // Začni s zápasem, který má největší rozdíl hráčů (aby se hráči maximálně lišili)
        remainingMatches.sort((a, b) => {
            const diffA = Math.abs(a.j - a.k);
            const diffB = Math.abs(b.j - b.k);
            return diffB - diffA; // Od největšího rozdílu
        });

        orderedMatches.push(remainingMatches.shift());

        // Pro každý další zápas vyber ten, který má nejméně společných hráčů s posledním zápasem
        while (remainingMatches.length > 0) {
            let bestMatch = remainingMatches[0]; // Výchozí zápas - první ze zbylých
            let bestScore = -2;
            let bestIdx = 0;

            remainingMatches.forEach((match, idx) => {
                const lastMatch = orderedMatches[orderedMatches.length - 1];
                // Počet společných hráčů: 0 = nejlepší, 2 = nejhorší
                const commonPlayers = (match.j === lastMatch.j || match.j === lastMatch.k ? 1 : 0) +
                                    (match.k === lastMatch.j || match.k === lastMatch.k ? 1 : 0);
                const score = -commonPlayers; // Negace pro seřazení

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = match;
                    bestIdx = idx;
                }
            });

            orderedMatches.push(bestMatch);
            remainingMatches.splice(bestIdx, 1);
        }

        group.matches = orderedMatches;

        groups.push(group);
    }

    return {
        name: name,
        groups: groups,
        bracket: createBracket()
    };
}

// VYTVOŘENÍ PAVOUKA
function createBracket() {
    const bracket = {
        rounds: [
            { title: 'Osmifinále', matches: [] },
            { title: 'Čtvrtfinále', matches: [] },
            { title: 'Semifinále', matches: [] },
            { title: 'Finále', matches: [] }
        ]
    };

    // Osmifinále - 8 zápasů
    for (let i = 0; i < 8; i++) {
        bracket.rounds[0].matches.push({
            player1: null,
            player2: null,
            winner: null
        });
    }

    // Čtvrtfinále - 4 zápasy
    for (let i = 0; i < 4; i++) {
        bracket.rounds[1].matches.push({
            player1: null,
            player2: null,
            winner: null
        });
    }

    // Semifinále - 2 zápasy
    for (let i = 0; i < 2; i++) {
        bracket.rounds[2].matches.push({
            player1: null,
            player2: null,
            winner: null
        });
    }

    // Finále - 1 zápas
    bracket.rounds[3].matches.push({
        player1: null,
        player2: null,
        winner: null
    });

    return bracket;
}

// ULOŽENÍ DAT
function saveData() {
    localStorage.setItem('tournamentData', JSON.stringify(tournamentData));
}

// VYKRESLENÍ
function render() {
    renderDiscipline(tournamentData.discipline1, 'discipline1');
    renderDiscipline(tournamentData.discipline2, 'discipline2');
    renderBrackets();
    updateRankings();

    // Zobraz uložené vítěze pokud existují
    displayWinnersDisplay();
}

// ZOBRAZENÍ PANELU S VÍTĚZI
function displayWinnersDisplay() {
    // Vytvoř nebo aktualizuj element pro vítěze
    let winnersDisplay = document.getElementById('winnersDisplay');
    if (!winnersDisplay) {
        winnersDisplay = document.createElement('div');
        winnersDisplay.id = 'winnersDisplay';
        winnersDisplay.style.marginTop = '40px';
        winnersDisplay.style.marginBottom = '40px';
        winnersDisplay.style.padding = '20px';
        winnersDisplay.style.backgroundColor = '#fff3cd';
        winnersDisplay.style.borderRadius = '8px';
        winnersDisplay.style.textAlign = 'center';
        winnersDisplay.style.borderLeft = '5px solid #ffc107';

        // Vložit za bracket-container a před ranking-container
        const bracketContainer = document.querySelector('.bracket-container');
        const rankingContainer = document.querySelector('.ranking-container');
        if (bracketContainer && rankingContainer && rankingContainer.parentNode) {
            rankingContainer.parentNode.insertBefore(winnersDisplay, rankingContainer);
        }
    }

    // Aktualizuj obsah s vítězi
    let content = '<div style="font-size: 24px; font-weight: bold; color: #333;">';
    if (tournamentData.winners[0]) {
        content += '<div style="margin-bottom: 15px;">🗡️ Meč: <span style="color: #d63031; font-size: 28px;">' + tournamentData.winners[0] + '</span></div>';
    }
    if (tournamentData.winners[1]) {
        content += '<div style="margin-bottom: 15px;">🗡️+🛡️ Meč + Štít: <span style="color: #d63031; font-size: 28px;">' + tournamentData.winners[1] + '</span></div>';
    }

    if (!tournamentData.winners[0] && !tournamentData.winners[1]) {
        content += '<div style="color: #999;">Klikni na pohár vedle jména finalisty</div>';
    }

    content += '</div>';
    winnersDisplay.innerHTML = content;
}

// VYKRESLENÍ DISCIPLÍNY
function renderDiscipline(discipline, disciplineId) {
    const container = document.getElementById(disciplineId + 'Groups');
    container.innerHTML = '';

    discipline.groups.forEach((group, groupIdx) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'group';

        const headerEl = document.createElement('div');
        headerEl.className = `group-header`;

        // Barvy hráčů v záhlaví
        const colorMap = {
            red: '#ef4444',
            blue: '#3b82f6',
            green: '#22c55e',
            yellow: '#eab308'
        };
        const colorBars = group.players.map(p => {
            return `<span style="flex:1; padding:5px; text-align:center; background:${colorMap[p.color]}; color:white; border-right:1px solid white;">${p.name}</span>`;
        }).join('');
        headerEl.innerHTML = `<strong style="color: #333; margin-right: 10px;">Skupina ${group.id}</strong>${colorBars}`;
        headerEl.style.display = 'flex';
        headerEl.style.alignItems = 'center';
        groupEl.appendChild(headerEl);

        const contentEl = document.createElement('div');
        contentEl.className = 'group-content';

        // Tabulka s zápasy
        const tableEl = document.createElement('table');
        tableEl.className = 'match-table';

        // Header tabulky
        const headerRow = tableEl.createTHead().insertRow();
        const cols = ['Barva 1', 'Skóre', 'Barva 2', 'Body 1', 'Body 2'];
        cols.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });

        // Řádky zápasů
        const tbody = tableEl.createTBody();
        group.matches.forEach((match, matchIdx) => {
            const row = tbody.insertRow();

            // Hráč 1 - s barvou
            let td = row.insertCell();
            td.className = `player-name ${match.player1Color}`;
            td.textContent = `${match.player1Name}`;

            // Skóre
            td = row.insertCell();
            td.className = 'score-cell';
            const scoreDiv = document.createElement('div');
            scoreDiv.style.display = 'flex';
            scoreDiv.style.gap = '4px';
            scoreDiv.style.justifyContent = 'center';
            scoreDiv.style.alignItems = 'center';

            // Tlačítka a input pro skóre 1
            const scoreGroup1 = document.createElement('div');
            scoreGroup1.style.display = 'flex';
            scoreGroup1.style.gap = '2px';
            scoreGroup1.style.alignItems = 'center';

            const btnMinus1 = document.createElement('button');
            btnMinus1.textContent = '-';
            btnMinus1.style.padding = '2px 6px';
            btnMinus1.style.minWidth = '24px';
            btnMinus1.style.cursor = 'pointer';
            btnMinus1.onclick = (e) => {
                e.preventDefault();
                input1.value = Math.max(0, parseInt(input1.value) - 1);
                updateScore(disciplineId, groupIdx, matchIdx, 'score1', input1.value);
            };
            scoreGroup1.appendChild(btnMinus1);

            const input1 = document.createElement('input');
            input1.type = 'text';
            input1.inputMode = 'numeric';
            input1.value = match.score1;
            input1.style.width = '40px';
            input1.addEventListener('change', () => updateScore(disciplineId, groupIdx, matchIdx, 'score1', input1.value));
            input1.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    updateScore(disciplineId, groupIdx, matchIdx, 'score1', input1.value);
                    input2.focus();
                }
            });
            scoreGroup1.appendChild(input1);

            const btnPlus1 = document.createElement('button');
            btnPlus1.textContent = '+';
            btnPlus1.style.padding = '2px 6px';
            btnPlus1.style.minWidth = '24px';
            btnPlus1.style.cursor = 'pointer';
            btnPlus1.onclick = (e) => {
                e.preventDefault();
                input1.value = parseInt(input1.value) + 1;
                updateScore(disciplineId, groupIdx, matchIdx, 'score1', input1.value);
            };
            scoreGroup1.appendChild(btnPlus1);

            scoreDiv.appendChild(scoreGroup1);

            const colon = document.createElement('span');
            colon.textContent = ':';
            scoreDiv.appendChild(colon);

            // Tlačítka a input pro skóre 2
            const scoreGroup2 = document.createElement('div');
            scoreGroup2.style.display = 'flex';
            scoreGroup2.style.gap = '2px';
            scoreGroup2.style.alignItems = 'center';

            const btnMinus2 = document.createElement('button');
            btnMinus2.textContent = '-';
            btnMinus2.style.padding = '2px 6px';
            btnMinus2.style.minWidth = '24px';
            btnMinus2.style.cursor = 'pointer';
            btnMinus2.onclick = (e) => {
                e.preventDefault();
                input2.value = Math.max(0, parseInt(input2.value) - 1);
                updateScore(disciplineId, groupIdx, matchIdx, 'score2', input2.value);
            };
            scoreGroup2.appendChild(btnMinus2);

            const input2 = document.createElement('input');
            input2.type = 'text';
            input2.inputMode = 'numeric';
            input2.value = match.score2;
            input2.style.width = '40px';
            input2.addEventListener('change', () => updateScore(disciplineId, groupIdx, matchIdx, 'score2', input2.value));
            input2.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    updateScore(disciplineId, groupIdx, matchIdx, 'score2', input2.value);
                    // Přesun na další řádek - najdi další input1 v tabulce
                    const nextRow = row.nextElementSibling;
                    if (nextRow) {
                        const nextInput = nextRow.querySelector('.score-cell input');
                        if (nextInput) {
                            nextInput.focus();
                        }
                    }
                }
            });
            scoreGroup2.appendChild(input2);

            const btnPlus2 = document.createElement('button');
            btnPlus2.textContent = '+';
            btnPlus2.style.padding = '2px 6px';
            btnPlus2.style.minWidth = '24px';
            btnPlus2.style.cursor = 'pointer';
            btnPlus2.onclick = (e) => {
                e.preventDefault();
                input2.value = parseInt(input2.value) + 1;
                updateScore(disciplineId, groupIdx, matchIdx, 'score2', input2.value);
            };
            scoreGroup2.appendChild(btnPlus2);

            scoreDiv.appendChild(scoreGroup2);

            td.appendChild(scoreDiv);

            // Hráč 2 - s barvou
            td = row.insertCell();
            td.className = `player-name ${match.player2Color}`;
            td.textContent = `${match.player2Name}`;

            // Body 1
            td = row.insertCell();
            td.className = `result-cell ${match.player1Color}`;
            td.textContent = match.points1;
            td.onclick = () => toggleWinner(disciplineId, groupIdx, matchIdx, match.player1Id);

            // Body 2
            td = row.insertCell();
            td.className = `result-cell ${match.player2Color}`;
            td.textContent = match.points2;
            td.onclick = () => toggleWinner(disciplineId, groupIdx, matchIdx, match.player2Id);
        });

        contentEl.appendChild(tableEl);
        groupEl.appendChild(contentEl);
        container.appendChild(groupEl);
    });
}


// AKTUALIZACE SKÓRE
function updateScore(disciplineId, groupIdx, matchIdx, field, value) {
    const discipline = disciplineId === 'discipline1' ? tournamentData.discipline1 : tournamentData.discipline2;
    const match = discipline.groups[groupIdx].matches[matchIdx];

    const score = parseInt(value) || 0;

    if (field === 'score1') {
        match.score1 = score;
    } else {
        match.score2 = score;
    }

    // Výpočet bodů
    if (match.score1 > match.score2) {
        match.points1 = 3;
        match.points2 = 0;
    } else if (match.score1 < match.score2) {
        match.points1 = 0;
        match.points2 = 3;
    } else if (match.score1 === match.score2 && match.score1 > 0) {
        match.points1 = 1;
        match.points2 = 1;
    } else {
        match.points1 = 0;
        match.points2 = 0;
    }

    saveData();
    render();
}

// TOGGLE VÍTĚZE
function toggleWinner(disciplineId, groupIdx, matchIdx, playerId) {
    const discipline = disciplineId === 'discipline1' ? tournamentData.discipline1 : tournamentData.discipline2;
    const match = discipline.groups[groupIdx].matches[matchIdx];

    if (match.winner === playerId) {
        match.winner = null;
    } else {
        match.winner = playerId;
    }

    saveData();
    render();
}

// VYKRESLENÍ PAVOUKU
function renderBrackets() {
    const container = document.getElementById('bracketContent');
    container.innerHTML = '';

    [tournamentData.discipline1, tournamentData.discipline2].forEach((discipline, discIdx) => {
        const bracketEl = document.createElement('div');

        const titleEl = document.createElement('h3');
        titleEl.style.marginBottom = '10px';
        titleEl.textContent = discipline.name;
        bracketEl.appendChild(titleEl);

        const bracket = document.createElement('div');
        bracket.className = 'bracket';

        discipline.bracket.rounds.forEach((round, roundIdx) => {
            const roundEl = document.createElement('div');
            roundEl.className = 'bracket-round';

            const titleEl = document.createElement('div');
            titleEl.className = 'bracket-round-title';
            titleEl.textContent = round.title;
            roundEl.appendChild(titleEl);

            // Pro osmifinále - seskup zápasy do párů
            if (roundIdx === 0) {
                for (let i = 0; i < round.matches.length; i += 2) {
                    const pairEl = document.createElement('div');
                    pairEl.className = 'match-pair';

                    // První zápas páru
                    const match1 = round.matches[i];
                    const matchEl1 = createMatchElement(match1, i, discIdx, roundIdx, discipline);
                    pairEl.appendChild(matchEl1);

                    // Druhý zápas páru
                    if (i + 1 < round.matches.length) {
                        const match2 = round.matches[i + 1];
                        const matchEl2 = createMatchElement(match2, i + 1, discIdx, roundIdx, discipline);
                        pairEl.appendChild(matchEl2);
                    }

                    roundEl.appendChild(pairEl);
                }
            } else {
                // Ostatní kola - normální vykreslení s dynamickým rozestupem
                const matchHeight = 50; // přibližná výška jednoho matche
                const matchGap = 10; // gap mezi matchy v osmifinále
                const pairHeight = matchHeight * 2 + matchGap; // výška páru

                round.matches.forEach((match, matchIdx) => {
                    const matchEl = createMatchElement(match, matchIdx, discIdx, roundIdx, discipline);

                    // Vypočítej margin-top aby byl match v středu páru
                    if (roundIdx === 1) { // Čtvrtfinále
                        // První zápas (index 0) má margin-top 0, ostatní mají 58px
                        const marginTop = matchIdx === 0 ? 0 : 58;
                        matchEl.style.marginTop = marginTop + 'px';
                    } else if (roundIdx === 2) { // Semifinále
                        // První zápas (index 0) má margin-top 15px, druhý (index 1) má 150px
                        const marginTop = matchIdx === 0 ? 15 : 150;
                        matchEl.style.marginTop = marginTop + 'px';
                    } else if (roundIdx === 3) { // Finále
                        // Finálový match je uprostřed - margin-top 290px
                        matchEl.style.marginTop = 50 + 'px';
                    }

                    roundEl.appendChild(matchEl);
                });
            }

            bracket.appendChild(roundEl);
        });

        bracketEl.appendChild(bracket);
        container.appendChild(bracketEl);
    });
}

// VYTVOŘENÍ MATCH ELEMENTU
function createMatchElement(match, matchIdx, discIdx, roundIdx, discipline) {
    const matchEl = document.createElement('div');
    matchEl.className = 'match-box';

    const p1 = tournamentData.players.find(p => p.id === match.player1);
    const p2 = tournamentData.players.find(p => p.id === match.player2);

    // Hráč 1
    const playerEl1 = document.createElement('div');
    playerEl1.className = `match-player ${p1?.color || 'gray'} ${match.winner === match.player1 ? 'winner' : ''}`;
    playerEl1.style.cursor = 'pointer';
    playerEl1.style.position = 'relative';

    if (p1) {
        const nameEl = document.createElement('span');
        nameEl.textContent = p1.name;
        nameEl.style.overflow = 'hidden';
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.textOverflow = 'ellipsis';
        nameEl.style.flex = '1';
        playerEl1.appendChild(nameEl);

        // Přidej ikonku poháru do finále vedle jména
        if (roundIdx === 3) { // Finále
            const cupIcon = document.createElement('span');
            cupIcon.textContent = '🏆';
            cupIcon.style.cursor = 'pointer';
            cupIcon.style.marginLeft = '4px';
            cupIcon.style.fontSize = '14px';
            cupIcon.onclick = (e) => {
                e.stopPropagation();
                selectWinner(discIdx, p1.name);
            };
            playerEl1.appendChild(cupIcon);
        }
    } else {
        playerEl1.textContent = '-';
        playerEl1.style.color = '#999';
    }

    playerEl1.onclick = (e) => {
        e.stopPropagation();
        openPlayerSelector(discIdx, roundIdx, matchIdx, 1, playerEl1);
    };
    matchEl.appendChild(playerEl1);

    // Hráč 2
    const playerEl2 = document.createElement('div');
    playerEl2.className = `match-player ${p2?.color || 'gray'} ${match.winner === match.player2 ? 'winner' : ''}`;
    playerEl2.style.cursor = 'pointer';
    playerEl2.style.position = 'relative';

    if (p2) {
        const nameEl = document.createElement('span');
        nameEl.textContent = p2.name;
        nameEl.style.overflow = 'hidden';
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.textOverflow = 'ellipsis';
        nameEl.style.flex = '1';
        playerEl2.appendChild(nameEl);

        // Přidej ikonku poháru do finále vedle jména
        if (roundIdx === 3) { // Finále
            const cupIcon = document.createElement('span');
            cupIcon.textContent = '🏆';
            cupIcon.style.cursor = 'pointer';
            cupIcon.style.marginLeft = '4px';
            cupIcon.style.fontSize = '14px';
            cupIcon.onclick = (e) => {
                e.stopPropagation();
                selectWinner(discIdx, p2.name);
            };
            playerEl2.appendChild(cupIcon);
        }
    } else {
        playerEl2.textContent = '-';
        playerEl2.style.color = '#999';
    }

    playerEl2.onclick = (e) => {
        e.stopPropagation();
        openPlayerSelector(discIdx, roundIdx, matchIdx, 2, playerEl2);
    };
    matchEl.appendChild(playerEl2);

    return matchEl;
}

// FUNKCE PRO VÝBĚR VÍTĚZE FINÁLE
function selectWinner(discIdx, winnerName) {
    // Ulož vítěze
    tournamentData.winners[discIdx] = winnerName;
    saveData();

    // Aktualizuj zobrazení vítězů
    displayWinnersDisplay();
}

// POMOCNÁ FUNKCE - HLEDÁNÍ SPOLEČNÉHO PREFIXU
function findCommonPrefix(strings) {
    if (strings.length === 0) return '';

    let prefix = '';
    for (let i = 0; i < strings[0].length; i++) {
        const char = strings[0][i];
        if (strings.every(str => str[i] === char)) {
            prefix += char;
        } else {
            break;
        }
    }
    return prefix;
}

// OTEVŘENÍ SELECTORU PRO VÝBĚR HRÁČE
function openPlayerSelector(discIdx, roundIdx, matchIdx, playerPosition, element) {
    const discipline = discIdx === 0 ? tournamentData.discipline1 : tournamentData.discipline2;
    const match = discipline.bracket.rounds[roundIdx].matches[matchIdx];

    // Všichni hráči jsou dostupní na všech polích
    let availablePlayers = tournamentData.players.filter(p => {
        // Filtruj pouze na základě disciplíny (zda hráč participuje v dané disciplíně)
        if (discIdx === 0) {
            return p.discipline1;
        } else {
            return p.discipline2;
        }
    });

    // Bez filtrování - zobrazí se všichni dostupní hráči
    // (Hráče lze zadat kamkoli, i když jsou už jinde v pavouku)

    // Vytvoř input pole
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Jméno...';
    inputField.style.width = '100%';
    inputField.style.padding = '4px 6px';
    inputField.style.border = '2px solid #3b82f6';
    inputField.style.boxSizing = 'border-box';
    inputField.style.fontSize = '12px';
    inputField.style.backgroundColor = 'white';
    inputField.style.color = 'black';

    // Skryj obsah (span s jménem nebo textContent)
    if (element.querySelector('span')) {
        element.querySelector('span').style.display = 'none';
    }
    // Vymaž textContent pokud je tam "-"
    const originalContent = element.innerHTML;
    element.innerHTML = '';
    element.appendChild(inputField);

    // Definuj closeInput funkci
    const closeInput = (e) => {
        // Pokud se kliklo mimo input, zavři bez uložení
        if (e.target !== inputField && !element.contains(e.target)) {
            // Vrať stav na zobrazení jména - vrať původní obsah
            inputField.remove();
            suggestionsContainer.remove();
            element.innerHTML = originalContent;
            document.removeEventListener('click', closeInput);
        }
    };

    // Funkce pro výběr hráče
    function selectPlayer(player) {
        if (playerPosition === 1) {
            match.player1 = player.id;
        } else {
            match.player2 = player.id;
        }

        // Odstraněno automatické propisování do dalšího kola
        // updateBracketProgression(discIdx, roundIdx, matchIdx, player.id);
        inputField.remove();
        suggestionsContainer.remove();
        document.removeEventListener('click', closeInput);

        saveData();
        // Jen re-render pavouku, ne celé stránky
        renderBrackets();
        updateRankings();
    }

    // Vytvoř suggestions container
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.style.position = 'absolute';
    suggestionsContainer.style.top = '100%';
    suggestionsContainer.style.left = '0';
    suggestionsContainer.style.right = '0';
    suggestionsContainer.style.backgroundColor = 'white';
    suggestionsContainer.style.border = '1px solid #ddd';
    suggestionsContainer.style.borderTop = 'none';
    suggestionsContainer.style.borderRadius = '0 0 4px 4px';
    suggestionsContainer.style.maxHeight = '200px';
    suggestionsContainer.style.overflowY = 'auto';
    suggestionsContainer.style.display = 'none';
    suggestionsContainer.style.zIndex = '10001';
    element.appendChild(suggestionsContainer);

    let selectedIndex = -1;

    // Funkce pro zobrazení návrhů
    function showSuggestions(searchText) {
        suggestionsContainer.innerHTML = '';

        // Pokud je input prázdný, zobraz všechny dostupné hráče
        let filtered;
        if (!searchText.trim()) {
            filtered = availablePlayers;
        } else {
            filtered = availablePlayers.filter(player =>
                player.name.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (filtered.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        suggestionsContainer.style.display = 'block';
        selectedIndex = -1;

        filtered.forEach((player, idx) => {
            const option = document.createElement('div');
            option.setAttribute('data-player-id', player.id);
            option.style.padding = '8px 12px';
            option.style.cursor = 'pointer';
            option.style.borderBottom = '1px solid #eee';
            option.style.color = '#333';
            option.textContent = player.name;

            option.onmouseover = () => {
                option.style.backgroundColor = '#e0e0e0';
            };
            option.onmouseout = () => {
                option.style.backgroundColor = 'white';
            };

            option.onclick = (e) => {
                e.stopPropagation();
                selectPlayer(player);
            };

            suggestionsContainer.appendChild(option);
        });
    }

    // Funkce pro highlight
    function highlightOption(index) {
        const options = Array.from(suggestionsContainer.querySelectorAll('[data-player-id]'));
        options.forEach((opt, i) => {
            if (i === index) {
                opt.style.backgroundColor = '#3b82f6';
                opt.style.color = 'white';
                opt.style.fontWeight = 'bold';
            } else {
                opt.style.backgroundColor = 'white';
                opt.style.color = '#333';
                opt.style.fontWeight = 'normal';
            }
        });
    }

    // Event listener pro input
    inputField.addEventListener('input', (e) => {
        showSuggestions(e.target.value);

        // Autofill - automatické doplnění jména
        const searchText = e.target.value.trim();
        if (searchText.length > 0) {
            const filtered = availablePlayers.filter(player =>
                player.name.toLowerCase().startsWith(searchText.toLowerCase())
            );

            if (filtered.length === 1) {
                // Jen jeden návrh - automaticky ho doplň
                const fullName = filtered[0].name;
                inputField.value = fullName;
                inputField.setSelectionRange(searchText.length, fullName.length);
            } else if (filtered.length > 1) {
                // Více návrhů - doplň společný prefix
                const commonPrefix = findCommonPrefix(filtered.map(p => p.name));
                if (commonPrefix.length > searchText.length) {
                    inputField.value = commonPrefix;
                    inputField.setSelectionRange(searchText.length, commonPrefix.length);
                }
            }
        }
    });

    // Klávesové zkratky
    inputField.addEventListener('keydown', (e) => {
        const options = Array.from(suggestionsContainer.querySelectorAll('[data-player-id]'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (options.length > 0) {
                selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
                highlightOption(selectedIndex);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (options.length > 0) {
                selectedIndex = Math.max(selectedIndex - 1, -1);
                if (selectedIndex >= 0) {
                    highlightOption(selectedIndex);
                } else {
                    options.forEach(opt => {
                        opt.style.backgroundColor = 'white';
                        opt.style.color = '#333';
                        opt.style.fontWeight = 'normal';
                    });
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();

            if (selectedIndex >= 0 && options[selectedIndex]) {
                // Vyber označený návrh
                const playerId = options[selectedIndex].getAttribute('data-player-id');
                const foundPlayer = availablePlayers.find(p => p.id == playerId);
                if (foundPlayer) {
                    selectPlayer(foundPlayer);
                }
            } else if (options.length === 1) {
                // Jen jeden návrh - vyber ho
                const playerId = options[0].getAttribute('data-player-id');
                const foundPlayer = availablePlayers.find(p => p.id == playerId);
                if (foundPlayer) {
                    selectPlayer(foundPlayer);
                }
            }
        } else if (e.key === 'Escape') {
            inputField.remove();
            suggestionsContainer.remove();
            document.removeEventListener('click', closeInput);
        }
    });

    // Focus na input a hned zobraz všechny návrhy
    inputField.focus();
    inputField.select();

    // Zobraz všechny dostupné hráče hned po otevření
    showSuggestions('');

    // Event listener pro zavření
    setTimeout(() => {
        document.addEventListener('click', closeInput);
    }, 0);
}

// PROGRESE V PAVOUKU
function updateBracketProgression(discIdx, roundIdx, matchIdx, playerId) {
    const discipline = discIdx === 0 ? tournamentData.discipline1 : tournamentData.discipline2;

    if (roundIdx < 3) {
        const nextRound = discipline.bracket.rounds[roundIdx + 1];
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const isFirstPlayer = matchIdx % 2 === 0;

        if (isFirstPlayer) {
            nextRound.matches[nextMatchIdx].player1 = playerId;
        } else {
            nextRound.matches[nextMatchIdx].player2 = playerId;
        }
    }
}

// ZÍSKEJ VÍTĚZE FINÁLE
function getChampions() {
    const champions = {};

    [tournamentData.discipline1, tournamentData.discipline2].forEach((discipline, discIdx) => {
        const finalRound = discipline.bracket.rounds[3]; // Finále je čtvrté kolo (index 3)
        const finalMatch = finalRound.matches[0]; // Jen jeden zápas ve finále

        if (finalMatch.winner) {
            const winner = tournamentData.players.find(p => p.id === finalMatch.winner);
            if (winner) {
                champions[discipline.name] = winner.name;
            }
        } else {
            champions[discipline.name] = null;
        }
    });

    return champions;
}

// FINÁLNÍ ŽEBŘÍČEK
function updateRankings() {
    const container = document.getElementById('rankingContent');
    container.innerHTML = '';

    [tournamentData.discipline1, tournamentData.discipline2].forEach((discipline, discIdx) => {
        const ranking = calculateRanking(discipline);

        const listEl = document.createElement('div');
        listEl.className = 'ranking-list';

        const titleEl = document.createElement('h3');
        titleEl.textContent = discipline.name;
        listEl.appendChild(titleEl);

        ranking.forEach((entry, idx) => {
            const itemEl = document.createElement('div');
            itemEl.className = `ranking-item ${entry.color}`;

            const numEl = document.createElement('div');
            numEl.className = 'ranking-number';
            numEl.textContent = idx + 1;
            itemEl.appendChild(numEl);

            const nameEl = document.createElement('div');
            nameEl.className = 'ranking-name';
            nameEl.textContent = entry.name;
            itemEl.appendChild(nameEl);

            const pointsEl = document.createElement('div');
            pointsEl.className = 'ranking-points';
            pointsEl.textContent = entry.points + ' bodů';
            itemEl.appendChild(pointsEl);

            listEl.appendChild(itemEl);
        });

        container.appendChild(listEl);
    });
}

function calculateRanking(discipline) {
    const playerPoints = {};

    // Sběr bodů ze skupin
    discipline.groups.forEach(group => {
        group.matches.forEach(match => {
            if (!playerPoints[match.player1Id]) {
                playerPoints[match.player1Id] = {
                    id: match.player1Id,
                    name: match.player1Name,
                    color: match.player1Color,
                    points: 0
                };
            }
            if (!playerPoints[match.player2Id]) {
                playerPoints[match.player2Id] = {
                    id: match.player2Id,
                    name: match.player2Name,
                    color: match.player2Color,
                    points: 0
                };
            }

            playerPoints[match.player1Id].points += match.points1;
            playerPoints[match.player2Id].points += match.points2;
        });
    });

    const ranking = Object.values(playerPoints).sort((a, b) => b.points - a.points);
    return ranking;
}

// RESET
function resetAll() {
    if (confirm('Opravdu chceš smazat vše?')) {
        localStorage.removeItem('tournamentData');
        initTournament();
        render();
    }
}

// EXPORT DO EXCELU
function exportToExcel() {
    const workbook = XLSX.utils.book_new();

    // ===== MEČ - SKUPINY =====
    const mecGroupsData = [];
    mecGroupsData.push(['MEČ - BODY V KOLECH']);
    mecGroupsData.push([]);

    tournamentData.discipline1.groups.forEach((group, groupIdx) => {
        mecGroupsData.push([`Skupina ${group.id}`]);
        mecGroupsData.push(['Hráč 1', 'Skóre 1', 'Skóre 2', 'Hráč 2', 'Body 1', 'Body 2']);

        group.matches.forEach(match => {
            mecGroupsData.push([
                match.player1Name,
                match.score1,
                match.score2,
                match.player2Name,
                match.points1,
                match.points2
            ]);
        });

        mecGroupsData.push([]);
    });

    const mecGroupsSheet = XLSX.utils.aoa_to_sheet(mecGroupsData);
    XLSX.utils.book_append_sheet(workbook, mecGroupsSheet, 'Meč - Skupiny');

    // ===== MEČ + ŠTÍT - SKUPINY =====
    const mecStitGroupsData = [];
    mecStitGroupsData.push(['MEČ + ŠTÍT - BODY V KOLECH']);
    mecStitGroupsData.push([]);

    tournamentData.discipline2.groups.forEach((group, groupIdx) => {
        mecStitGroupsData.push([`Skupina ${group.id}`]);
        mecStitGroupsData.push(['Hráč 1', 'Skóre 1', 'Skóre 2', 'Hráč 2', 'Body 1', 'Body 2']);

        group.matches.forEach(match => {
            mecStitGroupsData.push([
                match.player1Name,
                match.score1,
                match.score2,
                match.player2Name,
                match.points1,
                match.points2
            ]);
        });

        mecStitGroupsData.push([]);
    });

    const mecStitGroupsSheet = XLSX.utils.aoa_to_sheet(mecStitGroupsData);
    XLSX.utils.book_append_sheet(workbook, mecStitGroupsSheet, 'Meč+Štít - Skupiny');

    // ===== MEČ - PAVOUK =====
    const mecBracketData = [];
    mecBracketData.push(['MEČ - POSTUP V PAVOUKU']);
    mecBracketData.push([]);

    tournamentData.discipline1.bracket.rounds.forEach((round, roundIdx) => {
        mecBracketData.push([round.title]);
        mecBracketData.push(['Hráč 1', 'Hráč 2', 'Vítěz']);

        round.matches.forEach((match, matchIdx) => {
            const p1 = tournamentData.players.find(p => p.id === match.player1);
            const p2 = tournamentData.players.find(p => p.id === match.player2);
            const winner = tournamentData.players.find(p => p.id === match.winner);

            mecBracketData.push([
                p1 ? p1.name : '-',
                p2 ? p2.name : '-',
                winner ? winner.name : '-'
            ]);
        });

        mecBracketData.push([]);
    });

    // Přidej vítěze
    mecBracketData.push(['VÍTĚZ TURNAJE']);
    mecBracketData.push([tournamentData.winners[0] || '-']);

    const mecBracketSheet = XLSX.utils.aoa_to_sheet(mecBracketData);
    XLSX.utils.book_append_sheet(workbook, mecBracketSheet, 'Meč - Pavouk');

    // ===== MEČ + ŠTÍT - PAVOUK =====
    const mecStitBracketData = [];
    mecStitBracketData.push(['MEČ + ŠTÍT - POSTUP V PAVOUKU']);
    mecStitBracketData.push([]);

    tournamentData.discipline2.bracket.rounds.forEach((round, roundIdx) => {
        mecStitBracketData.push([round.title]);
        mecStitBracketData.push(['Hráč 1', 'Hráč 2', 'Vítěz']);

        round.matches.forEach((match, matchIdx) => {
            const p1 = tournamentData.players.find(p => p.id === match.player1);
            const p2 = tournamentData.players.find(p => p.id === match.player2);
            const winner = tournamentData.players.find(p => p.id === match.winner);

            mecStitBracketData.push([
                p1 ? p1.name : '-',
                p2 ? p2.name : '-',
                winner ? winner.name : '-'
            ]);
        });

        mecStitBracketData.push([]);
    });

    // Přidej vítěze
    mecStitBracketData.push(['VÍTĚZ TURNAJE']);
    mecStitBracketData.push([tournamentData.winners[1] || '-']);

    const mecStitBracketSheet = XLSX.utils.aoa_to_sheet(mecStitBracketData);
    XLSX.utils.book_append_sheet(workbook, mecStitBracketSheet, 'Meč+Štít - Pavouk');

    // ===== MEČ - FINÁLNÍ ŽEBŘÍČEK =====
    const mecRankingData = [];
    mecRankingData.push(['MEČ - FINÁLNÍ ŽEBŘÍČEK']);
    mecRankingData.push([]);
    mecRankingData.push(['Pořadí', 'Jméno', 'Body']);

    const mecRanking = calculateRanking(tournamentData.discipline1);
    mecRanking.forEach((entry, idx) => {
        mecRankingData.push([
            idx + 1,
            entry.name,
            entry.points
        ]);
    });

    const mecRankingSheet = XLSX.utils.aoa_to_sheet(mecRankingData);
    XLSX.utils.book_append_sheet(workbook, mecRankingSheet, 'Meč - Žebříček');

    // ===== MEČ + ŠTÍT - FINÁLNÍ ŽEBŘÍČEK =====
    const mecStitRankingData = [];
    mecStitRankingData.push(['MEČ + ŠTÍT - FINÁLNÍ ŽEBŘÍČEK']);
    mecStitRankingData.push([]);
    mecStitRankingData.push(['Pořadí', 'Jméno', 'Body']);

    const mecStitRanking = calculateRanking(tournamentData.discipline2);
    mecStitRanking.forEach((entry, idx) => {
        mecStitRankingData.push([
            idx + 1,
            entry.name,
            entry.points
        ]);
    });

    const mecStitRankingSheet = XLSX.utils.aoa_to_sheet(mecStitRankingData);
    XLSX.utils.book_append_sheet(workbook, mecStitRankingSheet, 'Meč+Štít - Žebříček');

    // ===== VÍTĚZOVÉ =====
    const winnersData = [];
    winnersData.push(['VÍTĚZOVÉ TURNAJE']);
    winnersData.push([]);
    winnersData.push(['Disciplína', 'Vítěz']);
    winnersData.push(['Meč', tournamentData.winners[0] || '-']);
    winnersData.push(['Meč + Štít', tournamentData.winners[1] || '-']);

    const winnersSheet = XLSX.utils.aoa_to_sheet(winnersData);
    XLSX.utils.book_append_sheet(workbook, winnersSheet, 'Vítězové');

    // STAŽENÍ SOUBORU
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(workbook, `turnaj_kundo_${timestamp}.xlsx`);
}

// START
loadData();
