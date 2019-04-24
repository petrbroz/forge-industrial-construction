async function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 45.643940, lng: -73.520483 },
        zoom: 16
    });
    map.setMapTypeId('satellite');

    const resp = await fetch('/api/data/facilities');
    const facilities = await resp.json();
    for (const facility of facilities) {
        const url = '/facility/' + facility.id;
        const facilityPath = new google.maps.Polygon({
            path: facility.region,
            geodesic: true,
            strokeColor: '#EBB30B',
            strokeOpacity: 0.8,
            fillColor: '#EBB30B',
            fillOpacity: 0.6,
            strokeWeight: 2
        });
        facilityPath.setMap(map);
        facilityPath.addListener('click', function() { window.location = url; });
        const infoWindow = new google.maps.InfoWindow();
        infoWindow.setContent(`<a href="${url}">${facility.name}</a>`);
        infoWindow.setPosition({
            lat: facility.region.reduce((prev, curr) => prev + curr.lat, 0) / facility.region.length,
            lng: facility.region.reduce((prev, curr) => prev + curr.lng, 0) / facility.region.length,
        });
        infoWindow.open(map);
    }
}
