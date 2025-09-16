"use strict";
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const HEADWAY_MIN = parseInt(process.env.HEADWAY_MIN) || 3;
const LAST_WINDOW_START = process.env.LAST_WINDOW_START || "00:45";
const SERVICE_END = process.env.SERVICE_END || "01:15";

const KNOWN_STATIONS = [
    "Chatelet", "Bastille", "Nation", "République", "Gare du Nord",
    "Montparnasse", "Charles de Gaulle", "Champs Élysées", "Opéra", "Louvre"
];

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    return { hours: parseInt(hours), minutes: parseInt(minutes) };
}

function getCurrentTime() {
    if (process.env.MOCK_TIME) {
        const [hours, minutes] = process.env.MOCK_TIME.split(':');
        const mockDate = new Date();
        mockDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return mockDate;
    }
    return new Date();
}

function nextArrival(now = new Date(), headwayMin = HEADWAY_MIN) {
    const tz = 'Europe/Paris';
    const toHM = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');

    const end = new Date(now);
    const endTime = parseTime(SERVICE_END);
    end.setHours(endTime.hours, endTime.minutes, 0, 0);

    const lastWindow = new Date(now);
    const lastWindowTime = parseTime(LAST_WINDOW_START);
    lastWindow.setHours(lastWindowTime.hours, lastWindowTime.minutes, 0, 0);

    const serviceStart = new Date(now);
    serviceStart.setHours(5,30,0,0);

    if (now.getHours() >= 5) {
        lastWindow.setDate(lastWindow.getDate() + 1);
        end.setDate(end.getDate() + 1);
    } else if (now.getHours() >= 2) {
        return { service: 'closed', tz };
    }
    if (now > end && now < serviceStart) {
        return { service: 'closed', tz };
    }

    const next = new Date(now.getTime() + headwayMin*60*1000);
    return {
        nextArrival: toHM(next),
        isLast: now >= lastWindow && now <= end,
        headwayMin,
        tz
    };
}

function getMultipleArrivals(now, n, headwayMin = HEADWAY_MIN) {
    const arrivals = [];
    const lastWindow = new Date(now);
    const lastWindowTime = parseTime(LAST_WINDOW_START);
    lastWindow.setHours(lastWindowTime.hours, lastWindowTime.minutes, 0, 0);

    const end = new Date(now);
    const endTime = parseTime(SERVICE_END);
    end.setHours(endTime.hours, endTime.minutes, 0, 0);

    if (now.getHours() >= 5) {
        lastWindow.setDate(lastWindow.getDate() + 1);
        end.setDate(end.getDate() + 1);
    }

    for (let i = 0; i < n; i++) {
        const arrivalTime = new Date(now.getTime() + (i + 1) * headwayMin * 60 * 1000);
        const toHM = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');

        arrivals.push({
            time: toHM(arrivalTime),
            isLast: arrivalTime >= lastWindow && arrivalTime <= end
        });
    }
    return arrivals;
}

function suggestStations(query) {
    if (!query) return [];
    const queryLower = query.toLowerCase();
    return KNOWN_STATIONS.filter(station =>
        station.toLowerCase().includes(queryLower) ||
        station.toLowerCase().startsWith(queryLower)
    );
}

app.use((req, res, next) => {
    const t0 = Date.now();
    res.on("finish", () => {
        const t1 = Date.now();
        const duration = t1 - t0;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    })
    next();
})

app.get("/health", (req, res) => {
    return res.status(200).json({
        status: "ok"
    })
});

app.get("/next-metro", (req, res) => {
    const station = req.query.station;
    const n = parseInt(req.query.n) || 1;

    if (!station) {
        return res.status(400).json({
            error: "Station parameter is required"
        });
    }

    if (!KNOWN_STATIONS.includes(station)) {
        const suggestions = suggestStations(station);
        return res.status(404).json({
            error: "unknown station",
            suggestions: suggestions
        });
    }

    if (n < 1 || n > 5) {
        return res.status(400).json({
            error: "Parameter n must be between 1 and 5"
        });
    }

    const now = getCurrentTime();
    const metroInfo = nextArrival(now, HEADWAY_MIN);

    if (metroInfo.service === 'closed') {
        return res.status(200).json({
            service: "closed",
            tz: "Europe/Paris"
        });
    }

    if (n === 1) {
        return res.status(200).json({
            station: station,
            line: "M7",
            headwayMin: metroInfo.headwayMin,
            nextArrival: metroInfo.nextArrival,
            isLast: metroInfo.isLast,
            tz: metroInfo.tz
        });
    } else {
        const arrivals = getMultipleArrivals(now, n, HEADWAY_MIN);
        return res.status(200).json({
            station: station,
            line: "M7",
            headwayMin: HEADWAY_MIN,
            tz: "Europe/Paris",
            arrivals: arrivals
        });
    }
});

app.use((req, res, next) => {
    console.log("URL not found: " + req.url);
    return res.status(404).json({
        error: "URL not found"
    })
})

app.listen(PORT, () => {
    console.log("Server started on port: " + PORT);
    console.log(`Configuration: HEADWAY=${HEADWAY_MIN}min, LAST_WINDOW=${LAST_WINDOW_START}, SERVICE_END=${SERVICE_END}`);
})