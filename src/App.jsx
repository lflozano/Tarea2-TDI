import { useEffect, useRef, useState } from 'react';
import './App.css';
import initMap from './Map';

function App() {
  const mapContainerRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [positions, setPositions] = useState([]);
  const [chats, setChats] = useState([]);

  const [restaurants, setRestaurants] = useState([]);
  const [products, setProducts] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [courses, setCourses] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);

  const mapFunctions = useRef(null);

  useEffect(() => {
    if (mapContainerRef.current) {
      const mapFuncs = initMap({
        mapContainer: mapContainerRef.current,
        onUsers: (updatedUsers) => setUsers(updatedUsers),
        onDeliveries: (updatedDeliveries) => setDeliveries(updatedDeliveries),
        onPosition: (updatedPosition) => setPositions((prevPositions) => [...prevPositions, updatedPosition]),
        onChat: (updatedChat) => setChats((prevChats) => [...prevChats, updatedChat]),
        onRestaurants: (updatedRestaurants) => setRestaurants(updatedRestaurants),
        onProducts: (updatedProducts) => {
          setCourses(updatedProducts.courses);
          setIngredients(updatedProducts.ingredients);
          // Combina courses e ingredients en un solo array para mostrar en el menú desplegable
          setProducts([...updatedProducts.courses, ...updatedProducts.ingredients]);
        },
        onDestinations: (updatedDestinations) => setDestinations(updatedDestinations),
      });    
      if (mapFuncs) {
        mapFunctions.current = mapFuncs;
      }
    }
  }, []);

  // Función para renderizar los mensajes del chat
  function renderChatMessages() {
    return chats.map((chat, index) => (
      <div className="chat-message" key={index}>
        <strong>{chat.name}:</strong> {chat.message}
        <br />
        <small>
          Fecha: {new Date(chat.date).toLocaleString()}
        </small>
      </div>
    ));
  }

  // Estado para manejar el mensaje que el usuario está escribiendo
  const [inputMessage, setInputMessage] = useState('');

  // Función para manejar el envío del mensaje
  function handleSendMessage(event) {
    event.preventDefault();
  
    // Asegúrate de que mapFunctions.current esté definido antes de acceder a sus propiedades
    if (!mapFunctions.current) {
      console.error('Error: Map functions no están disponibles.');
      return;
    }
  
    const websocket = mapFunctions.current.websocket;
  
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.error('Error: Websocket no está disponible.');
      return;
    }
  
    const payload = {
      "type": "MESSAGE",
      "payload": {
        "content": inputMessage,
      },
    };
  
    websocket.send(JSON.stringify(payload));
  
    setInputMessage(''); // Limpia el campo del mensaje después de enviarlo
  }
  
  async function handleCreateOrder() {
    if (!selectedRestaurant || !selectedProduct || !selectedDestination) {
      alert('Por favor, selecciona un restaurante, producto y destino.');
      return;
    }

    const websocket = mapFunctions.current.websocket;
  
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.error('Error: Websocket no está disponible.');
      return;
    }

    const payload = {
      "type": "ORDER",
      "payload": {
        "restaurant_id": selectedRestaurant,
        "product_id": selectedProduct,
        "destination": selectedDestination
      },
    };
  
    websocket.send(JSON.stringify(payload));
    alert('Pedido enviado.');
  }  

  return (
    <>
      <div className="Titulo">
        <h1>rAPI Eats</h1>
      </div>
      <div className="App">
        <div className="map" ref={mapContainerRef}></div>
        <div className="content">
          <h2>Chat</h2>
          <div className="chat">{renderChatMessages()}</div>
          <form onSubmit={(e) => handleSendMessage(e)} className="input-container">
            <input
              type="text"
              className="input-message"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
            />
            <button type="submit">Enviar</button>
          </form>
        </div>
      </div>
      <div className="Pedido">
        <div className="Eleccion">
          <h2>Restaurante</h2>
          <select value={selectedRestaurant} onChange={(e) => setSelectedRestaurant(e.target.value)}>
            <option value="" disabled>Selecciona un restaurante</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
        </div>
        <div className="Eleccion">
          <h2>Ingrediente</h2>
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="" disabled>Selecciona un producto</option>
            {Array.isArray(products) && products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
        <div className="Eleccion">
          <h2>Destino</h2>
          <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)}>
            <option value="" disabled>Selecciona un destino</option>
            {destinations.map((destination) => (<option key={destination.id} value={destination.id}>{destination.name}</option>
              ))}
            </select>
          </div>
          <div className="Eleccion">
            <button onClick={handleCreateOrder}>Crear Pedido</button>
          </div>
        </div>
    </>
  );
}

export default App;
