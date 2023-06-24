import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let mapInstance;

async function fetchCoursesAndIngredients(productId) {
  const resCourses = await fetch('https://tarea-1.2023-1.tallerdeintegracion.cl/courses');
  const coursesData = await resCourses.json();
  const courses = coursesData.items;

  const resIngredients = await fetch('https://tarea-1.2023-1.tallerdeintegracion.cl/ingredients');
  const ingredientsData = await resIngredients.json();
  const ingredients = ingredientsData.items;

  return { courses, ingredients };
}

async function getProductInfo(productId) {
  const { courses, ingredients } = await fetchCoursesAndIngredients(productId);

  const matchedCourse = courses.find((course) => course.id === productId);
  const matchedIngredient = ingredients.find((ingredient) => ingredient.id === productId);

  if (matchedCourse) {
    return {
      type: 'course',
      product: matchedCourse,
    };
  } else if (matchedIngredient) {
    return {
      type: 'ingredient',
      product: matchedIngredient,
    };
  } else {
    return {
      type: 'unknown',
      product: null,
    };
  }
}

let popupIndex = 0;

function addPopupToScreen(content) {
  const popupContainer = document.createElement('div');
  popupContainer.classList.add('popup-content');

  const statusContent = document.createElement('div');
  statusContent.innerHTML = content;

  popupContainer.appendChild(statusContent);

  const popupContainerElement = document.getElementById('popup-container');
  popupContainerElement.appendChild(popupContainer);

  setTimeout(() => {
    popupContainerElement.removeChild(popupContainer);
    popupIndex--;
  }, 2000); // Aumentamos el tiempo para que se muestren durante 10 segundos

  popupIndex++;
}

function initMap(options) {
  const { 
    mapContainer, onUsers, onDeliveries, onPosition, onChat, onRestaurants, onProducts, onDestinations, onOrderDelivered
  } = options;

  Promise.all([
    fetch('https://tarea-1.2023-1.tallerdeintegracion.cl/courses')
      .then((res) => res.json())
      .then((data) => data.items),
    fetch('https://tarea-1.2023-1.tallerdeintegracion.cl/ingredients')
      .then((res) => res.json())
      .then((data) => data.items),
  ]).then(([courses, ingredients]) => {
    onProducts({ courses, ingredients });
  });
  
  if (mapInstance) return; // Si el mapa ya está inicializado, no hacer nada
  const redIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const blueIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });


  var restaurants = {};
  var destinations = {};
  var delivererPositions = {};
  const deliveryColors = {};
  const delivererRoutes = {};
  const deliveryLines = {};
  const timeouts = {};

  var myIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/66/66841.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  var map = L.map(mapContainer).setView([-33.35, -70.5], 10);
  mapInstance = map;

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  let url = 'wss://tarea-2.2023-1.tallerdeintegracion.cl/connect';
  const websocket = new WebSocket(url);
  const payload = {
    type: 'JOIN',
    payload: {
      authorization: 'Basic bHVpcy5sb3phbm9AdWMuY2w6MTg2Mzk2OTA=',
    },
  };
  console.log(`Connecting to: ${url}. Sending: ${payload}`);
  websocket.onopen = () => {
    websocket.send(JSON.stringify(payload));
  };

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  websocket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data);
    
    if (event.type === 'RESTAURANTS') {
      onRestaurants(event.payload);
      event.payload.forEach((r) => {
        if (!(r.id in restaurants)) {
          restaurants[r.id] = r;
          var marker = L.marker([r.position.lat, r.position.long], { icon: blueIcon });
          marker.bindTooltip(r.name);
          marker.addTo(map);
          r.marker = marker;
        }
      });
    } else if (event.type === 'DESTINATIONS') {
      onDestinations(event.payload);
      event.payload.forEach((d) => {
        if (!(d.id in destinations)) {
          destinations[d.id] = d;
          var marker = L.marker([d.position.lat, d.position.long], { icon: redIcon });
          marker.bindTooltip(d.name);
          marker.addTo(map);
          d.marker = marker;
        }
      });
    } else if (event.type === 'POSITION') {
      onPosition(event.payload);
      const deliveryId = event.payload.delivery_id;
      const position = event.payload.position;
      const deliveryLine = deliveryLines[deliveryId];

      if (deliveryLine && deliveryLine.status === 'DELIVERED') {
        if (delivererPositions[deliveryId]) {
          delivererPositions[deliveryId].remove(); // Elimina el marcador del mapa
          delete delivererPositions[deliveryId]; // Elimina el marcador del objeto
        }
        if (delivererRoutes[deliveryId]) {
          delivererRoutes[deliveryId].remove(); // Elimina la ruta del mapa
          delete delivererRoutes[deliveryId]; // Elimina la ruta del objeto
        }
      } else { 
        if (delivererPositions[deliveryId]) {
          delivererPositions[deliveryId].setLatLng([position.lat, position.long]);
        } else {
          const delivererMarker = L.marker([position.lat, position.long], { icon: myIcon });
          delivererMarker.addTo(map);
          delivererPositions[deliveryId] = delivererMarker;
        }
        if (delivererRoutes[deliveryId]) {
          delivererRoutes[deliveryId].addLatLng([position.lat, position.long]);
        } else {
          const lineColor = deliveryColors[deliveryId];

          if (lineColor) {
            const delivererRoute = L.polyline(
              [[position.lat, position.long]],
              {
                color: lineColor,
                dashArray: '5, 10',
              }
            );
            delivererRoute.addTo(map);
            delivererRoutes[deliveryId] = delivererRoute;
          }
        }
      }
    } else if (event.type === 'USERS') {
      onUsers(event.payload);
    } else if (event.type === 'DELIVERIES') {
      onDeliveries(event.payload);
      event.payload.forEach(async(delivery) => {
        const restaurant = restaurants[delivery.restaurant_id];
        const destination = destinations[delivery.destination_id];
  
        if (restaurant && destination) {
          let lineColor;
  
          if (deliveryColors[delivery.id]) {
            lineColor = deliveryColors[delivery.id];
          } else {
            lineColor = getRandomColor();
            deliveryColors[delivery.id] = lineColor;
          }
  
          if (!deliveryLines[delivery.id]) {
            const line = L.polyline(
              [
                [restaurant.position.lat, restaurant.position.long],
                [destination.position.lat, destination.position.long],
              ],
              { 
                color: lineColor, opacity: 0.5, // Opacidad reducida
              }
            );
            line.addTo(map);
            line.deliveryId = delivery.id;

            deliveryLines[delivery.id] = line;
          }
          delivery.status = delivery.status || 'pending';

          const productId = delivery.product_id;
          const productInfo = await getProductInfo(productId);

          delivery.productInfo = productInfo;
          
          if (delivererPositions[delivery.id]) {
            const tooltipContent = `
              <p><b>Restaurante:</b> ${restaurant.name}</p>
              <p><b>Destino:</b> ${destination.name}</p>
              <p><b>Producto:</b> ${productInfo.product ? productInfo.product.name : 'No disponible'}</p>
            `;
            delivererPositions[delivery.id].bindTooltip(tooltipContent, { permanent: false });
          }
        }      
      });
    } else if (event.type === 'CHAT') {
      onChat({
        name: event.payload.name,
        message: event.payload.content,
        date: event.payload.date,
        level: event.payload.level,
      });
    } else if (event.type === 'DELIVERY_STATUS') {
      const deliveryId = event.payload.delivery_id;
      const deliveryLine = deliveryLines[deliveryId];
      if (deliveryLine) {
        deliveryLine.status = event.payload.status;
      }

      if (event.payload.status === 'DELIVERED') {
        onOrderDelivered();
      }
    
      const delivererMarker = delivererPositions[deliveryId];
      if (delivererMarker) {
        const statusContent = `
          <p><b>Delivery ID:</b> ${deliveryId}</p>
          <p><b>Delivery Status:</b> ${event.payload.status}</p>
        `;
    
        addPopupToScreen(statusContent);
      }
    }        
  });
  setTimeout(function () {
    window.dispatchEvent(new Event('resize'));
  }, 500);
  const mapFunctions = {
    mapInstance,
    websocket,
  };

  return mapFunctions;
}
export default initMap;

