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
const list = document.getElementById("inventory-list");

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

    try {
        await addDoc(productsCol, data);
        form.reset();
        alert("Registrado correctamente");
    } catch (error) { console.error(error); }
});

onSnapshot(productsCol, (snapshot) => {
    list.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const waLink = `https://wa.me/${item.whatsapp}?text=Confirmación: ${item.name}. Entrega en: ${item.deliveryPlace} el ${item.deliveryTime}`;

        list.innerHTML += `
            <tr>
                <td><img src="${item.photo || 'https://via.placeholder.com/50'}" width="50"></td>
                <td><strong>${item.name}</strong></td>
                <td>C: $${item.buyPrice}<br>V: $${item.sellPrice}</td>
                <td>${item.quantity}</td>
                <td>
                    <small>📍 ${item.deliveryPlace || 'No asignado'}</small><br>
                    <small>⏰ ${item.deliveryTime?.replace('T', ' ') || 'No asignada'}</small>
                </td>
                <td>
                    <a href="${waLink}" target="_blank">🟢</a>
                    <button class="btn-edit" onclick="changeDelivery('${id}')" title="Cambiar Entrega">📅</button>
                    <button class="btn-delete" onclick="deleteProduct('${id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
});

window.deleteProduct = async (id) => {
    if(confirm("¿Eliminar todos los datos de este producto?")) {
        await deleteDoc(doc(db, "productos", id));
    }
};

window.changeDelivery = async (id) => {
    const newPlace = prompt("Nuevo lugar de entrega:");
    const newTime = prompt("Nueva fecha/hora (ej: 2023-12-31 15:00):");
    if (newPlace || newTime) {
        await updateDoc(doc(db, "productos", id), { 
            deliveryPlace: newPlace, 
            deliveryTime: newTime 
        });
    }
};