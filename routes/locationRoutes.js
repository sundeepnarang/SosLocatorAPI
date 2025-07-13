const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// All routes from the C# controller are mapped here.
// The AcceptVerbs are handled by Express.js routing methods (get, post, all).

// ListOnlineEvents
router.all('/ListOnlineEvents', locationController.listOnlineEvents);

// ListOnlineEventsByTag
router.all('/ListOnlineEventsByTag/:TagName', locationController.listOnlineEventsByTag);

// ListAllEventsByTag
router.all('/ListAllEventsByTag/:TagName', locationController.listAllEventsByTag);

// OnlineEventByConferenceId
router.all('/OnlineEventByConferenceId/:ConferenceId', locationController.onlineEventByConferenceId);

// GetUpcomingOnlineEvents
router.all('/GetUpcomingOnlineEvents/:EventId', locationController.getUpcomingOnlineEvents);

// ListEventsByTag
router.all('/ListEventsByTag/:TagName/:CenterID', locationController.listEventsByTag);

// LoadCenterPhotoGallery
// Note: This endpoint's logic is now handled internally by searchLocationByURL
// and won't be exposed directly as a separate route unless explicitly needed.

// LoadSatsangPhotoGallery
// Note: This endpoint's logic is now handled internally by searchLocationByURL
// and won't be exposed directly as a separate route unless explicitly needed.

// searchLocationByURL
router.all('/searchLocationByURL/:LocationURL', locationController.searchLocationByURL);

// searchEventByURL
router.all('/searchEventByURL/:EventURL', locationController.searchEventByURL);

// searchMasterEventByURL
router.all('/searchMasterEventByURL/:EventURL', locationController.searchMasterEventByURL);

// listLatestFiveMasterEvents
router.get('/listLatestFiveMasterEvents', locationController.listLatestFiveMasterEvents);

// listMasterEvents
router.get('/listMasterEvents', locationController.listMasterEvents);

// listMasterEventsForCalendar
router.get('/listMasterEventsForCalendar', locationController.listMasterEventsForCalendar);

// searchAllLocationsByTagAndRadius
router.post('/searchAllLocationsByTagAndRadius', locationController.searchAllLocationsByTagAndRadius);

// searchAllLocationsByKeywordsAndRadius
router.post('/searchAllLocationsByKeywordsAndRadius', locationController.searchAllLocationsByKeywordsAndRadius);

// searchAllLocations
router.post('/searchAllLocations', locationController.searchAllLocations);

// searchLocations
router.post('/searchLocations', locationController.searchLocations);

// searchLocationsByBounds
router.post('/searchLocationsByBounds', locationController.searchLocationsByBounds);

// searchNearestSix
router.post('/searchNearestSix', locationController.searchNearestSix);

// searchNearestFourEvents
router.post('/searchNearestFourEvents', locationController.searchNearestFourEvents);

// searchNearestFiveEvents
router.post('/searchNearestFiveEvents', locationController.searchNearestFiveEvents);

// searchEventsByLocation
router.get('/searchEventsByLocation/:LocationURL', locationController.searchEventsByLocation);

// searchEventsWithinRadiusByLocation
router.get('/searchEventsWithinRadiusByLocation/:LocationURL/:RadiusLimit', locationController.searchEventsWithinRadiusByLocation);

// fetchLocalesByLocation
router.post('/fetchLocalesByLocation', locationController.fetchLocalesByLocation);

module.exports = router;