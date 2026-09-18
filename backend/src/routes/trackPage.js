import {Router} from 'express';

export const trackPageRouter = Router();


/*
 * GET /track/:shareToken
 *
 * This is the webpage opened by the emergency contact.
 *
 * It:
 * 1. Loads a Leaflet map.
 * 2. Requests the latest location every 5 seconds.
 * 3. Moves the marker when the user's location changes.
 */
trackPageRouter.get('/:shareToken', (req, res) => {
  const shareToken = req.params.shareToken;

  res.send(`
<!DOCTYPE html>

<html>

<head>

  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <title>
    Live Location - Smart Route AI
  </title>


  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />


  <style>

    body {
      margin: 0;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      background: #f5f7fb;
    }

    #info {
      padding: 16px;
      background: white;
      box-shadow:
        0 2px 8px rgba(0,0,0,0.08);
      position: relative;
      z-index: 1000;
    }

    #status {
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 6px;
    }

    #updated {
      color: #6b7280;
      font-size: 13px;
    }

    #map {
      height: 70vh;
      width: 100%;
    }

    #error {
      padding: 40px 16px;
      text-align: center;
      color: #dc2626;
      font-size: 16px;
    }

    .sos {
      color: #dc2626;
    }

  </style>

</head>


<body>


  <div id="info">

    <div id="status">
      Loading live location...
    </div>

    <div id="updated">
      Connecting...
    </div>

  </div>


  <div id="map"></div>


  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
  </script>


  <script>

    const shareToken =
      ${JSON.stringify(shareToken)};

    let map = null;
    let marker = null;


    /*
     * Initialize map using the first GPS position.
     */
    function initMap(latitude, longitude) {

      map = L.map('map').setView(
        [latitude, longitude],
        15
      );


      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; OpenStreetMap contributors'
        }
      ).addTo(map);


      marker = L.marker([
        latitude,
        longitude
      ]).addTo(map);


      marker.bindPopup(
        'Current location'
      ).openPopup();
    }


    /*
     * Fetch the latest GPS location.
     */
    async function poll() {

      try {

        const response = await fetch(
          '/api/public/track/' +
          encodeURIComponent(shareToken),
          {
            cache: 'no-store'
          }
        );


        if (!response.ok) {

          document.body.innerHTML = \`
            <div id="error">
              This tracking link is no longer valid.
            </div>
          \`;

          return;
        }


        const data =
          await response.json();


        /*
         * Update status.
         */
        const statusElement =
          document.getElementById('status');


        if (data.status === 'sos_triggered') {

          statusElement.textContent =
            '🚨 SOS ACTIVE - ' +
            (data.destination || 'Journey');

          statusElement.classList.add('sos');

        } else if (
          data.status === 'completed'
        ) {

          statusElement.textContent =
            'Journey completed - ' +
            (data.destination || 'Journey');

        } else {

          statusElement.textContent =
            'Live tracking - ' +
            (data.destination || 'Journey');
        }


        /*
         * Update location.
         */
        if (data.location) {

          const {
            latitude,
            longitude,
            recorded_at
          } = data.location;


          if (!map) {

            initMap(
              latitude,
              longitude
            );

          } else {

            marker.setLatLng([
              latitude,
              longitude
            ]);

            /*
             * Keep the moving marker centered.
             */
            map.panTo([
              latitude,
              longitude
            ]);
          }


          document.getElementById(
            'updated'
          ).textContent =
            'Last updated: ' +
            new Date(
              recorded_at
            ).toLocaleTimeString();

        } else {

          document.getElementById(
            'updated'
          ).textContent =
            'Waiting for first location update...';
        }


      } catch (error) {

        console.error(
          'Polling failed:',
          error
        );


        document.getElementById(
          'updated'
        ).textContent =
          'Connection problem. Retrying...';
      }
    }


    /*
     * First request immediately.
     */
    poll();


    /*
     * Then check every 5 seconds.
     */
    setInterval(
      poll,
      5000
    );

  </script>


</body>

</html>
  `);
});