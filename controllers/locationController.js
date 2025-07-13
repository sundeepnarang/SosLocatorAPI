const { sequelize, QueryTypes } = require('../config/database');
const path = require('path');
const fs = require('fs/promises'); // Use fs.promises for async file operations

// Helper function to format event address (similar to C#)
const formatEventAddress = (event) => {
    let eventAddress = event.Address1 || "";

    if (!eventAddress.toLowerCase().includes("online")) {
        if (event.Address2) eventAddress += ", " + event.Address2;
        if (event.City) eventAddress += ", " + event.City;
        if (event.State) eventAddress += ", " + event.State;
        if (event.Country) eventAddress += ", " + event.Country;
        if (event.ZipCode) eventAddress += ", " + event.ZipCode;
    }
    return eventAddress;
};

// Helper function to format event description (similar to C#)
const formatEventDescription = (event) => {
    let eventDescription = `<p>${event.LocationBlurb || ''}</p>`;
    eventDescription += `<p><b>Contact Information:</b><br/>`;
    if (event.ContactName) eventDescription += `<b>Contact Person:</b> ${event.ContactName}<br/>`;
    if (event.ContactEmail) eventDescription += `<b>Email:</b> ${event.ContactEmail}<br/>`;
    if (event.ContactPhone) eventDescription += `<b>Phone:</b> ${event.ContactPhone}<br/>`;
    if (event.FaxNumber) eventDescription += `<b>Fax:</b> ${event.FaxNumber}<br/>`;
    eventDescription += `</p>`;
    return eventDescription;
};

// Helper function for photo gallery loading
const loadPhotoGallery = async (locationId, galleryType) => {
    const galleryBasePath = process.env.LOCATOR_MEDIA_BASE_PATH;
    const galleryPhotoBaseLink = process.env.LOCATOR_MEDIA_BASE_LINK_PREFIX;

    let galleryFolder = path.join(galleryBasePath, galleryType, 'StockPhotos');
    let galleryPhotoLinkPrefix = `${galleryPhotoBaseLink}${galleryType}/StockPhotos/`;

    const customGalleryPath = path.join(galleryBasePath, galleryType, locationId);
    try {
        await fs.access(customGalleryPath); // Check if custom folder exists
        galleryFolder = customGalleryPath;
        galleryPhotoLinkPrefix = `${galleryPhotoBaseLink}${galleryType}/${locationId}/`;
    } catch (error) {
        // Directory doesn't exist, fall back to stock photos
    }

    const galleryFilesList = [];
    try {
        const files = await fs.readdir(galleryFolder);
        for (const file of files) {
            if (file.toLowerCase().endsWith('.jpg')) {
                galleryFilesList.push(galleryPhotoLinkPrefix + file);
            }
        }
    } catch (error) {
        console.error(`Error reading gallery folder ${galleryFolder}:`, error);
        // Return empty list or handle as per your application's error strategy
    }
    return galleryFilesList;
};


// Translating C# methods to Express.js handlers

exports.listOnlineEvents = async (req, res) => {
    try {
        const onlineEvents = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_ONLINE_EVENTS WHERE LOCATIONTYPE = 'OnlineEvent' ORDER BY EventStartDate`,
            { type: QueryTypes.SELECT }
        );
        res.json(onlineEvents);
    } catch (error) {
        console.error('Error in listOnlineEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listOnlineEventsByTag = async (req, res) => {
    try {
        const tagName = req.params.TagName;
        const simplifiedTagName = (tagName || 'notagspecified').trim().toLowerCase();
        const searchTag = `%#${simplifiedTagName}#%`;

        const taggedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_ONLINE_EVENTS
             WHERE LOWER(REPLACE(LocationTag,' ','')) LIKE :searchTag
             AND LOCATIONTYPE = 'OnlineEvent' ORDER BY EventStartDate`,
            {
                replacements: { searchTag },
                type: QueryTypes.SELECT
            }
        );
        res.json({ events: taggedLocations });
    } catch (error) {
        console.error('Error in listOnlineEventsByTag:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listAllEventsByTag = async (req, res) => {
    try {
        const tagName = req.params.TagName;
        const simplifiedTagName = (tagName || 'notagspecified').trim().toLowerCase();
        const searchTag = `%#${simplifiedTagName}#%`;

        const taggedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_ALL_EVENTS
             WHERE LOWER(REPLACE(LocationTag,' ','')) LIKE :searchTag
             AND LOCATIONTYPE IN ('OnlineEvent','Event') ORDER BY EventStartDate`,
            {
                replacements: { searchTag },
                type: QueryTypes.SELECT
            }
        );
        res.json({ events: taggedLocations });
    } catch (error) {
        console.error('Error in listAllEventsByTag:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.onlineEventByConferenceId = async (req, res) => {
    try {
        const { ConferenceId } = req.params;

        const taggedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_ONLINE_EVENTS
             WHERE BMConferenceId = :ConferenceId
             AND LOCATIONTYPE = 'OnlineEvent' ORDER BY EventStartDate`,
            {
                replacements: { ConferenceId },
                type: QueryTypes.SELECT
            }
        );
        res.json({ events: taggedLocations });
    } catch (error) {
        console.error('Error in onlineEventByConferenceId:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getUpcomingOnlineEvents = async (req, res) => {
    try {
        const { EventId } = req.params; // EventId is a path parameter here

        const upcomingOnlineEvents = await sequelize.query(
            `SELECT TOP 5 * FROM vw_SOS_WEB_ONLINE_EVENTS
             WHERE LocationID <> :EventId
             AND LOCATIONTYPE = 'OnlineEvent' ORDER BY EventStartDate`,
            {
                replacements: { EventId: parseInt(EventId, 10) },
                type: QueryTypes.SELECT
            }
        );
        res.json({ events: upcomingOnlineEvents });
    } catch (error) {
        console.error('Error in getUpcomingOnlineEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listEventsByTag = async (req, res) => {
    try {
        const tagName = req.params.TagName;
        const centerID = req.params.CenterID; // Optional parameter

        const simplifiedTagName = (tagName || 'notagspecified').trim().toLowerCase();
        const searchTag = `%#${simplifiedTagName}#%`;
        let taggedLocations;

        let query = `SELECT * FROM vw_SOS_WEB_LOCATIONS WHERE `;
        const replacements = { TagName: searchTag };

        if (centerID && parseInt(centerID, 10) > 0) {
            const eventCenterID = parseInt(centerID, 10);
            query += `( CenterID = :CenterID OR LOWER(REPLACE(LocationTag,' ','')) LIKE :TagName) `;
            replacements.CenterID = eventCenterID;
        } else {
            query += `LOWER(REPLACE(LocationTag,' ','')) LIKE :TagName `;
        }

        query += `AND LocationType = 'Event' ORDER BY EventStartDate`;

        taggedLocations = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({ events: taggedLocations });
    } catch (error) {
        console.error('Error in listEventsByTag:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchLocationByURL = async (req, res) => {
    try {
        const { LocationURL } = req.params;
        const simplifiedURL = (LocationURL || '').toLowerCase().replace(/ /g, '');

        const resolvedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_LOCATIONS
             WHERE LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL
             AND LocationType <> 'Event'`,
            {
                replacements: { LocationURL: simplifiedURL },
                type: QueryTypes.SELECT
            }
        );

        let locationResponse = {};
        if (resolvedLocations.length > 0) {
            const centerLocations = resolvedLocations.filter(loc => loc.LocationType === "Center");
            const satsangLocations = resolvedLocations.filter(loc => loc.LocationType === "Satsang");

            if (centerLocations.length > 0) {
                locationResponse.Location = centerLocations[0];
                locationResponse.Location.photoGallery = await loadPhotoGallery(locationResponse.Location.LocationID.toString(), 'CenterGallery');
            } else if (satsangLocations.length > 0) {
                locationResponse.Location = satsangLocations[0];
                locationResponse.Location.photoGallery = await loadPhotoGallery(locationResponse.Location.LocationID.toString(), 'SatsangGallery');
            } else {
                locationResponse = { empty: true };
            }
        } else {
            locationResponse = { empty: true, resolvedURL: simplifiedURL };
        }

        res.json(locationResponse);
    } catch (error) {
        console.error('Error in searchLocationByURL:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchEventByURL = async (req, res) => {
    try {
        const { EventURL } = req.params;
        const simplifiedURL = (EventURL || '').toLowerCase().replace(/ /g, '');

        let resolvedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_LOCATIONS
             WHERE LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL
             AND LocationType = 'Event' ORDER BY EventStartDate`,
            {
                replacements: { LocationURL: simplifiedURL },
                type: QueryTypes.SELECT
            }
        );

        let eventResponse = {};
        if (resolvedLocations.length > 0) {
            eventResponse = { Location: resolvedLocations[0] };
        } else {
            const resolvedOnlineLocations = await sequelize.query(
                `SELECT * FROM vw_SOS_WEB_ONLINE_EVENTS
                 WHERE LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL
                 AND LocationType = 'OnlineEvent' ORDER BY EventStartDate`,
                {
                    replacements: { LocationURL: simplifiedURL },
                    type: QueryTypes.SELECT
                }
            );
            if (resolvedOnlineLocations.length > 0) {
                eventResponse = { Location: resolvedOnlineLocations[0] };
            } else {
                eventResponse = { empty: true };
            }
        }
        res.json(eventResponse);
    } catch (error) {
        console.error('Error in searchEventByURL:', error);
        res.status(500).json({ error: error.message, empty: true });
    }
};

exports.searchMasterEventByURL = async (req, res) => {
    try {
        const { EventURL } = req.params;
        const simplifiedURL = (EventURL || '').toLowerCase().replace(/ /g, '');

        const resolvedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_MASTEREVENTS
             WHERE LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL
             AND LocationType = 'MasterEvent' ORDER BY EventStartDate`,
            {
                replacements: { LocationURL: simplifiedURL },
                type: QueryTypes.SELECT
            }
        );

        let eventResponse = {};
        if (resolvedLocations.length > 0) {
            eventResponse = { Location: resolvedLocations[0] };
        } else {
            eventResponse = { empty: true };
        }
        res.json(eventResponse);
    } catch (error) {
        console.error('Error in searchMasterEventByURL:', error);
        res.status(500).json({ error: error.message, empty: true });
    }
};

exports.listLatestFiveMasterEvents = async (req, res) => {
    try {
        const masterEvents = await sequelize.query(
            `SELECT TOP 5 * FROM VW_SOS_WEB_MASTEREVENTS
             WHERE LOCATIONTYPE = 'MasterEvent'
             ORDER BY EventStartDate`,
            { type: QueryTypes.SELECT }
        );
        res.json(masterEvents);
    } catch (error) {
        console.error('Error in listLatestFiveMasterEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listMasterEvents = async (req, res) => {
    try {
        const masterEvents = await sequelize.query(
            `SELECT * FROM VW_SOS_WEB_MASTEREVENTS
             WHERE LOCATIONTYPE = 'MasterEvent'
             ORDER BY EventStartDate`,
            { type: QueryTypes.SELECT }
        );
        res.json(masterEvents);
    } catch (error) {
        console.error('Error in listMasterEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listMasterEventsForCalendar = async (req, res) => {
    try {
        const masterEvents = await sequelize.query(
            `SELECT * FROM VW_SOS_WEB_MASTEREVENTS
             WHERE LOCATIONTYPE = 'MasterEvent'
             ORDER BY EventStartDate`,
            { type: QueryTypes.SELECT }
        );

        const masterEventsItems = masterEvents.map(masterEvent => ({
            name: masterEvent.LocationName,
            day: new Date(masterEvent.EventStartDate).getDate(),
            month: new Date(masterEvent.EventStartDate).getMonth() + 1, // Month is 0-indexed in JS
            year: new Date(masterEvent.EventStartDate).getFullYear(),
            time: new Date(masterEvent.EventStartDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: "1",
            color: "1",
            location: formatEventAddress(masterEvent),
            description: formatEventDescription(masterEvent),
            hideLocation: masterEvent.HideLocation,
            hideTime: masterEvent.HideTime
        }));

        res.json({ items: masterEventsItems });
    } catch (error) {
        console.error('Error in listMasterEventsForCalendar:', error);
        res.status(500).json({ error: error.message });
    }
};

// Internal helper for `searchEventsByLocation` and `searchEventsWithinRadiusByLocation`
const getEventsWithinRadius = async (eventListLocation, radius) => {
    return await sequelize.query(
        `;with radsrch as (
            SELECT top 500 *,
            Acos(
                CASE WHEN (
                    COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                    COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                    SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                ) > 1 THEN 1 ELSE (
                    COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                    COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                    SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                ) END
            ) * 3958.75 AS distance
            FROM vw_SOS_WEB_LOCATIONS WHERE LOCATIONTYPE = 'Event' order by EventStartDate, distance asc
        )select * from radsrch where distance < :radius order by EventStartDate, distance asc`,
        {
            replacements: { lat: eventListLocation.Latitude, lng: eventListLocation.Longitude, radius },
            type: QueryTypes.SELECT
        }
    );
};


exports.searchAllLocationsByTagAndRadius = async (req, res) => {
    try {
        let { lat, lng, radius, limitResultCount, locationTag } = req.body;

        radius = radius == null || radius === 0 ? 20 : radius;
        limitResultCount = limitResultCount == null || limitResultCount === 0 ? 100 : limitResultCount;

        if (!locationTag) {
            return res.json([]); // Return empty array if no tag
        } else {
            locationTag = locationTag.trim().replace(/ /g, '').toLowerCase();
        }

        const nearbySatsangs = await sequelize.query(
            `;with radsrch as (
                SELECT TOP ${limitResultCount} *,
                Acos(
                    CASE WHEN (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) > 1 THEN 1 ELSE (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) END
                ) * 3958.75 AS distance
                FROM vw_SOS_WEB_LOCATIONS WHERE LOWER(REPLACE(LocationTag,' ','')) = :locationTag ORDER BY distance ASC
            ) SELECT * FROM radsrch WHERE distance < :radius ORDER BY distance ASC`,
            {
                replacements: { lat, lng, radius, locationTag },
                type: QueryTypes.SELECT
            }
        );

        res.json(nearbySatsangs);
    } catch (error) {
        console.error('Error in searchAllLocationsByTagAndRadius:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchAllLocationsByKeywordsAndRadius = async (req, res) => {
    try {
        let { lat, lng, radius, limitResultCount, eventKeywords, excludeKeywords, locationTypes } = req.body;

        radius = radius == null || radius === 0 ? 20 : radius;
        limitResultCount = limitResultCount == null || limitResultCount === 0 ? 100 : limitResultCount;

        let keywordWhereClause = '';
        if (!eventKeywords) {
            return res.json([]);
        } else {
            const keywords = eventKeywords.split(/[,;]/).map(k => k.trim());
            keywordWhereClause = keywords.map(k => `(LocationName LIKE '%${k}%' OR LocationBlurb LIKE '%${k}%')`).join(' OR ');
        }

        let optionalExcludeWhereClause = '';
        if (excludeKeywords) {
            const excludeKws = excludeKeywords.split(/[,;]/).map(k => k.trim());
            optionalExcludeWhereClause = ` AND ( ${excludeKws.map(k => `LocationName NOT LIKE '%${k}%' AND LocationBlurb NOT LIKE '%${k}%'`).join(' AND ')} )`;
        }

        let optionalLocationTypeClause = '';
        if (locationTypes) {
            const types = locationTypes.split(/[,;]/).map(t => `'${t.trim()}'`).join(',');
            optionalLocationTypeClause = ` AND LocationType IN (${types})`;
        }

        const nearBySatsangsQuery = `;with radsrch as (
            SELECT TOP ${limitResultCount} *,
            Acos(
                CASE WHEN (
                    COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                    COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                    SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                ) > 1 THEN 1 ELSE (
                    COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                    COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                    SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                ) END
            ) * 3958.75 AS distance
            FROM vw_SOS_WEB_LOCATIONS WHERE (
                LocationType IN ('Center','Satsang')
                OR
                (
                    LocationType IN ('Event')
                    AND (${keywordWhereClause})
                    ${optionalExcludeWhereClause}
                )
            )
            ${optionalLocationTypeClause} ORDER BY distance ASC
        ) SELECT * FROM radsrch WHERE distance < :radius ORDER BY distance ASC`;

        const nearbySatsangs = await sequelize.query(nearBySatsangsQuery, {
            replacements: { lat, lng, radius },
            type: QueryTypes.SELECT
        });

        res.json(nearbySatsangs);
    } catch (error) {
        console.error('Error in searchAllLocationsByKeywordsAndRadius:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchAllLocations = async (req, res) => {
    try {
        let { lat, lng, radius, limitResultCount } = req.body;

        radius = radius == null || radius === 0 ? 20 : radius;
        limitResultCount = limitResultCount == null || limitResultCount === 0 ? 100 : limitResultCount;

        const nearbySatsangs = await sequelize.query(
            `;with radsrch as (
                SELECT TOP ${limitResultCount} *,
                Acos(
                    CASE WHEN (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) > 1 THEN 1 ELSE (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) END
                ) * 3958.75 AS distance
                FROM vw_SOS_WEB_LOCATIONS ORDER BY distance ASC
            ) SELECT * FROM radsrch WHERE distance < :radius ORDER BY distance ASC`,
            {
                replacements: { lat, lng, radius },
                type: QueryTypes.SELECT
            }
        );
        res.json(nearbySatsangs);
    } catch (error) {
        console.error('Error in searchAllLocations:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchLocations = async (req, res) => {
    try {
        let { lat, lng, radius } = req.body;

        radius = radius == null ? 20 : radius;
        const limitResultCount = radius === 1500 ? 2 : 10; // This logic is from the original C#

        const nearbySatsangs = await sequelize.query(
            `;with radsrch as (
                SELECT TOP ${limitResultCount} *,
                Acos(
                    CASE WHEN (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) > 1 THEN 1 ELSE (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) END
                ) * 3958.75 AS distance
                FROM vw_SOS_WEB_LOCATIONS ORDER BY distance ASC
            ) SELECT * FROM radsrch WHERE distance < :radius ORDER BY distance ASC`,
            {
                replacements: { lat, lng, radius },
                type: QueryTypes.SELECT
            }
        );
        res.json(nearbySatsangs);
    } catch (error) {
        console.error('Error in searchLocations:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchLocationsByBounds = async (req, res) => {
    try {
        const { latTop, latBottom, lngLeft, lngRight } = req.body;
        let nearbySatsangs = [];

        let query = `SELECT * FROM vw_SOS_WEB_LOCATIONS WHERE latitude < :latTop AND latitude > :latBottom `;
        const replacements = { latTop, latBottom, lngLeft, lngRight };

        if (lngRight > lngLeft) {
            // Normal conditions
            query += `AND longitude > :lngLeft AND longitude < :lngRight`;
        } else {
            // Map wraps around
            query += `AND ((longitude > :lngLeft AND longitude < 180) OR (longitude > -180 AND longitude < :lngRight))`;
        }

        nearbySatsangs = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json(nearbySatsangs);
    } catch (error) {
        console.error('Error in searchLocationsByBounds:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchNearestSix = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        const nearestSix = await sequelize.query(
            `SELECT WL.*, NL.DISTANCE FROM VW_SOS_WEB_LOCATIONS WL, (
                SELECT TOP 6 LATLNG, MIN(LOCATIONID) AS LOCATIONID, MIN(DISTANCE) AS DISTANCE FROM
                (
                    SELECT TOP 400 LOCATIONID, LATLNG, LOCATIONTYPE,
                    ACOS(
                        CASE WHEN (
                            COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                            COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                            SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                        ) > 1 THEN 1 ELSE (
                            COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                            COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                            SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                        ) END
                    ) * 3958.75 AS DISTANCE
                    FROM VW_SOS_WEB_LOCATIONS ORDER BY DISTANCE ASC
                ) AS WEBLOCATIONS GROUP BY LATLNG ORDER BY DISTANCE ASC
            ) AS NL WHERE WL.LOCATIONID = NL.LOCATIONID AND WL.LATLNG = NL.LATLNG ORDER BY NL.DISTANCE`,
            {
                replacements: { lat, lng },
                type: QueryTypes.SELECT
            }
        );

        const locationsToBeAdded = {};
        let indexCount = 0;

        for (const locationRecord of nearestSix) {
            if (locationRecord.LocationType !== "Center") {
                const exactMatches = await sequelize.query(
                    `SELECT WL.*, 0 AS DISTANCE FROM VW_SOS_WEB_LOCATIONS WL
                     WHERE WL.LocationType IN ('Center', 'Satsang') AND
                     ROUND(WL.LATITUDE,4) = ROUND(:lat,4) AND ROUND(WL.LONGITUDE,4) = ROUND(:lng,4)`,
                    {
                        replacements: { lat: locationRecord.Latitude, lng: locationRecord.Longitude },
                        type: QueryTypes.SELECT
                    }
                );

                if (exactMatches.length > 0) {
                    let locationToAdd = exactMatches[0];
                    // Prefer English satsang if available
                    const englishSatsang = exactMatches.find(l => l.PrimaryLocale && l.PrimaryLocale.toLowerCase() === 'en');
                    if (englishSatsang) {
                        locationToAdd = englishSatsang;
                    }
                    locationsToBeAdded[indexCount] = locationToAdd;
                }
            }
            indexCount++;
        }

        // Apply changes to nearestSix list
        const finalNearestSix = [...nearestSix]; // Create a copy to modify
        for (const indexKey in locationsToBeAdded) {
            finalNearestSix.splice(indexKey, 1, locationsToBeAdded[indexKey]);
        }

        res.json(finalNearestSix);
    } catch (error) {
        console.error('Error in searchNearestSix:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchLocationsByCenter = async (req, res) => {
    try {
        const { centerId } = req.body;
        const centerLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_LOCATIONS
             WHERE CenterID = :centerIdParam
             AND LocationType = 'Satsang'`,
            {
                replacements: { centerIdParam: centerId },
                type: QueryTypes.SELECT
            }
        );
        res.json(centerLocations);
    } catch (error) {
        console.error('Error in searchLocationsByCenter:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchLocationsByCountry = async (req, res) => {
    try {
        const { country } = req.body;
        const countryLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_LOCATIONS
             WHERE Country = :countryParam
             AND LocationType IN ('Center', 'Satsang')`,
            {
                replacements: { countryParam: country },
                type: QueryTypes.SELECT
            }
        );
        res.json(countryLocations);
    } catch (error) {
        console.error('Error in searchLocationsByCountry:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchNearestFourEvents = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        const nearestFour = await sequelize.query(
            `SELECT TOP 4 *,
            ACOS(
                CASE WHEN (
                    COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                    COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                    SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                ) > 1 THEN 1 ELSE (
                    COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                    COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                    SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                ) END
            ) * 3958.75 AS DISTANCE
            FROM VW_SOS_WEB_LOCATIONS WHERE LOCATIONTYPE = 'Event' ORDER BY DISTANCE ASC, EventStartDate`,
            {
                replacements: { lat, lng },
                type: QueryTypes.SELECT
            }
        );
        res.json(nearestFour);
    } catch (error) {
        console.error('Error in searchNearestFourEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchNearestFiveEvents = async (req, res) => {
    try {
        let { lat, lng, radius, eventId } = req.body;

        const radiusLimit = (radius != null && radius > 0) ? radius : 25000;

        const nearestFive = await sequelize.query(
            `;with radsrch as (
                SELECT TOP 5 *,
                ACOS(
                    CASE WHEN (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) > 1 THEN 1 ELSE (
                        COS(LATITUDE/57.2958) * COS(LONGITUDE/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                        COS(LATITUDE/57.2958) * SIN(LONGITUDE/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                        SIN(LATITUDE/57.2958) * SIN(:lat/57.2958)
                    ) END
                ) * 3958.75 AS DISTANCE
                FROM VW_SOS_WEB_LOCATIONS
                WHERE LOCATIONTYPE = 'Event' AND LocationID <> :eventId
                ORDER BY DISTANCE ASC, EventStartDate
            ) SELECT * FROM radsrch WHERE distance < :radiusLimit ORDER BY DISTANCE ASC, EventStartDate`,
            {
                replacements: { lat, lng, eventId, radiusLimit },
                type: QueryTypes.SELECT
            }
        );
        res.json(nearestFive);
    } catch (error) {
        console.error('Error in searchNearestFiveEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchEventsByLocation = async (req, res) => {
    try {
        const { LocationURL } = req.params;
        const simplifiedName = (LocationURL || 'NOLOCATIONSPECIFIED').toLowerCase().replace(/ /g, '');

        let resolvedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_LOCATIONS
             WHERE LocationType <> 'Event' AND LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL`,
            {
                replacements: { LocationURL: simplifiedName },
                type: QueryTypes.SELECT
            }
        );

        if (resolvedLocations.length === 0) {
            resolvedLocations = await sequelize.query(
                `SELECT * FROM vw_SOS_WEB_LOCATIONS
                 WHERE LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL`,
                {
                    replacements: { LocationURL: simplifiedName },
                    type: QueryTypes.SELECT
                }
            );
        }

        let eventsResult = [];
        if (resolvedLocations.length > 0) {
            const eventListLocation = resolvedLocations[0];
            let eventsWithinRadius = await getEventsWithinRadius(eventListLocation, 50);

            if (eventsWithinRadius.length < 2) {
                eventsWithinRadius = await getEventsWithinRadius(eventListLocation, 100);
                if (eventsWithinRadius.length < 2) {
                    eventsWithinRadius = await getEventsWithinRadius(eventListLocation, 500);
                    if (eventsWithinRadius.length < 1) { // Original C# had <0, which means this condition would never be true. Changed to <1 for practical sense.
                        const nearestFiveAllEvents = await sequelize.query(
                            `SELECT TOP 5 *,
                            ACOS(
                                CASE WHEN (
                                    COS(latitude/57.2958) * COS(longitude/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                                    COS(latitude/57.2958) * SIN(longitude/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                                    SIN(latitude/57.2958) * SIN(:lat/57.2958)
                                ) > 1 THEN 1 ELSE (
                                    COS(latitude/57.2958) * COS(longitude/57.2958) * COS(:lat/57.2958) * COS(:lng/57.2958) +
                                    COS(latitude/57.2958) * SIN(longitude/57.2958) * COS(:lat/57.2958) * SIN(:lng/57.2958) +
                                    SIN(latitude/57.2958) * SIN(:lat/57.2958)
                                ) END
                            ) * 3958.75 AS DISTANCE
                            FROM VW_SOS_WEB_LOCATIONS WHERE LOCATIONTYPE = 'Event' ORDER BY DISTANCE ASC, EventStartDate`,
                            {
                                replacements: { lat: eventListLocation.Latitude, lng: eventListLocation.Longitude },
                                type: QueryTypes.SELECT
                            }
                        );
                        eventsResult = nearestFiveAllEvents;
                    } else {
                        eventsResult = eventsWithinRadius;
                    }
                } else {
                    eventsResult = eventsWithinRadius;
                }
            } else {
                eventsResult = eventsWithinRadius;
            }
        }
        res.json(eventsResult);
    } catch (error) {
        console.error('Error in searchEventsByLocation:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.searchEventsWithinRadiusByLocation = async (req, res) => {
    try {
        const { LocationURL, RadiusLimit } = req.params;
        const simplifiedName = (LocationURL || 'NOLOCATIONSPECIFIED').toLowerCase().replace(/ /g, '');
        let userRadiusLimit = 50;

        try {
            userRadiusLimit = parseInt(RadiusLimit, 10);
        } catch (parseError) {
            console.warn('Invalid RadiusLimit provided, defaulting to 50:', parseError.message);
        }

        let resolvedLocations = await sequelize.query(
            `SELECT * FROM vw_SOS_WEB_LOCATIONS
             WHERE LocationType <> 'Event' AND LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL`,
            {
                replacements: { LocationURL: simplifiedName },
                type: QueryTypes.SELECT
            }
        );

        if (resolvedLocations.length === 0) {
            resolvedLocations = await sequelize.query(
                `SELECT * FROM vw_SOS_WEB_LOCATIONS
                 WHERE LOWER(LTRIM(RTRIM(REPLACE(LocationURL,' ','')))) = :LocationURL`,
                {
                    replacements: { LocationURL: simplifiedName },
                    type: QueryTypes.SELECT
                }
            );
        }

        let eventsResult = [];
        if (resolvedLocations.length > 0) {
            const eventListLocation = resolvedLocations[0];
            eventsResult = await getEventsWithinRadius(eventListLocation, userRadiusLimit);
        }
        res.json(eventsResult);
    } catch (error) {
        console.error('Error in searchEventsWithinRadiusByLocation:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.fetchLocalesByLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        const allLocalesByLocation = await sequelize.query(
            `SELECT DISTINCT ISNULL(PrimaryLocale,'en') FROM VW_SOS_WEB_LOCATIONS WL
             WHERE ROUND(WL.LATITUDE,4) = ROUND(:lat,4) AND ROUND(WL.LONGITUDE,4) = ROUND(:lng,4) ORDER BY 1`,
            {
                replacements: { lat, lng },
                type: QueryTypes.SELECT
            }
        );

        const allLocalesAtLocation = [];
        let hasEnglishLanguage = false;

        for (const lang of allLocalesByLocation) {
            const thisLanguage = Object.values(lang)[0]; // Extract the value from the returned object
            if (thisLanguage) {
                if ("en".localeCompare(thisLanguage.toLowerCase()) === 0) {
                    hasEnglishLanguage = true;
                } else {
                    allLocalesAtLocation.push(thisLanguage);
                }
            }
        }

        if (hasEnglishLanguage) {
            allLocalesAtLocation.unshift("en"); // Add 'en' to the beginning
        }

        if (allLocalesAtLocation.length === 0) {
            allLocalesAtLocation.push("en");
        }

        res.json(allLocalesAtLocation);
    } catch (error) {
        console.error('Error in fetchLocalesByLocation:', error);
        res.status(500).json({ error: error.message });
    }
};