"use strict";
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;


function getCurrentTime() {
    if (process.env.MOCK_TIME) {
        const [hours, minutes] = process.env.MOCK_TIME.split(':');
        const mockDate = new Date();
        mockDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return mockDate;
    }
    return new Date();
}

function nextArrival(now = new Date(), headwayMin = 3) {
    const tz = 'Europe/Paris';
    const toHM = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');

    const end = new Date(now);
    end.setHours(1,15,0,0);

    const lastWindow = new Date(now);
    lastWindow.setHours(0,45,0,0);

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

    if (!station) {
        return res.status(400).json({
            error: "Station parameter is required"
        });
    }

    const now = getCurrentTime();
    const metroInfo = nextArrival(now, 3);

    if (metroInfo.service === 'closed') {
        return res.status(200).json({
            service: "closed",
            tz: "Europe/Paris"
        });
    }

    return res.status(200).json({
        station: station,
        line: "M7",
        headwayMin: metroInfo.headwayMin,
        nextArrival: metroInfo.nextArrival,
        isLast: metroInfo.isLast,
        tz: metroInfo.tz
    });
});
app.use((req, res, next) => {
    console.log("URL not found: " + req.url);
    return res.status(404).json({
        error: "URL not found"
    })
})

app.listen(PORT, () => {
    console.log("Server started on port: " + PORT);
})