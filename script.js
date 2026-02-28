import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtMQRYTfJfkwoWqTSxXSZJGYo-gKOt-Dg",
  authDomain: "miinventario-51af9.firebaseapp.com",
  projectId: "miinventario-51af9",
  storageBucket: "miinventario-51af9.firebasestorage.app",
  messagingSenderId: "791233911695",
  appId: "1:791233911695:web:030a17ce8e76e5f79849fa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsCol = collection(db, "productos");

const form = document.getElementById("product-form");
const listContainer = document.getElementById("inventory-list");

// Función para poner la hora en formato 12h AM/PM
function formatAMPM(dateStr) {
    if (!dateStr) return "Sin fecha";
    const date = new Date(dateStr);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    const strTime = hours + ':' + minutes + ' ' + ampm;
    return date.toLocaleDateString() + " - " + strTime;
}

// Función para ver qué tan urgente es (Nuevos colores pastel)
function getUrgencyClass(dateStr) {
    if (!dateStr) return "verde";
    const entrega = new Date(dateStr);
    const ahora = new Date();
    const difHoras = (entrega - ahora) / (1000 * 60 * 60);

    if (difHoras < 0) return "rojo"; // Ya pasó
    if (difHoras <= 10) return "rojo"; // Muy urgente (menos de 10h)
    if (difHoras <= 48) return "amarillo"; // Próximo (2 días)
    return "verde";
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById("name").value,
        buyPrice: document.getElementById("buyPrice").value,
        sellPrice: document.getElementById("sellPrice").value,
        quantity: document.getElementById("quantity").value,
        photo: document.getElementById("photo").value,
        whatsapp: document.getElementById("whatsapp").value,
        deliveryPlace: document.getElementById("deliveryPlace").value,
        deliveryTime: document.getElementById("deliveryTime").value
    };
    await addDoc(productsCol, data);
    form.reset();
});

// ESTA ES LA PARTE QUE CAMBIA (Línea 66 en adelante)
onSnapshot(productsCol, (snapshot) => {
    listContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const urgency = getUrgencyClass(item.deliveryTime);
        
        const card = document.createElement("div");
        card.className = `card ${urgency}`; // Aplica el color según urgencia
        card.innerHTML = `
            <div class="card-header">
                <img src="${item.photo || 'https://via.placeholder.com/100'}" onclick="showBigPhoto('${item.photo}')">
                <div>
                    <h2 style="margin:0; font-size:20px;">${item.name}</h2>
                    <span style="color:#666">Stock: ${item.quantity} unidades</span>
                </div>
            </div>
            <div class="card-body">
                <p><strong>💰 Precio Venta:</strong> $${item.sellPrice}</p>
                <p><strong>📍 Entrega en:</strong> ${item.deliveryPlace || 'No definido'}</p>
                <p><strong>⏰ Cuándo:</strong> ${formatAMPM(item.deliveryTime)}</p>
            </div>
            <div class="card-actions">
                <a href="https://wa.me/${item.whatsapp}" class="btn-item wa" target="_blank">💬</a>
                <button class="btn-item edit" onclick="editData('${id}')">📅</button>
                <button class="btn-item del" onclick="deleteProd('${id}')">🗑️</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
});

window.showBigPhoto = (url) => {
    const modal = document.getElementById("photo-modal");
    document.getElementById("modal-img").src = url || 'https://via.placeholder.com/300';
    modal.style.display = "flex";
};

window.deleteProd = async (id) => {
    if(confirm("¿Borrar permanentemente este producto?")) {
        await deleteDoc(doc(db, "productos", id));
    }
};

window.editData = async (id) => {
    const newPlace = prompt("¿Nuevo lugar de entrega?");
    const newTime = prompt("Nueva fecha y hora (ejemplo: 2024-05-15 14:30):");
    if(newPlace || newTime) {
        await updateDoc(doc(db, "productos", id), { 
            deliveryPlace: newPlace || "", 
            deliveryTime: newTime || "" 
        });
    }
};

