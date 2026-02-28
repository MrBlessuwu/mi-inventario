import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const invCol = collection(db, "productos");
const entCol = collection(db, "entregas");

let productosLocales = [];

// --- NAVEGACIÓN ---
const showTab = (tabName) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    if(tabName === 'inv') {
        document.getElementById('tab-inventario').classList.add('active');
        document.getElementById('btn-tab-inv').classList.add('active');
    } else {
        document.getElementById('tab-entregas').classList.add('active');
        document.getElementById('btn-tab-ent').classList.add('active');
    }
};

document.getElementById('btn-tab-inv')?.addEventListener('click', () => showTab('inv'));
document.getElementById('btn-tab-ent')?.addEventListener('click', () => showTab('ent'));

// --- BODEGA (GUARDAR) ---
document.getElementById("form-inventario").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await addDoc(invCol, {
            name: document.getElementById("inv-name").value,
            buyPrice: Number(document.getElementById("inv-buy").value),
            sellPrice: Number(document.getElementById("inv-sell").value),
            stock: Number(document.getElementById("inv-stock").value),
            photo: document.getElementById("inv-photo").value,
            visible: true 
        });
        e.target.reset();
        alert("¡Guardado en Bodega! ✨");
    } catch(err) { alert("Error: " + err); }
});

// --- ENTREGAS (GUARDAR Y RESTAR STOCK) ---
document.getElementById("form-entrega").addEventListener("submit", async (e) => {
    e.preventDefault();
    const selects = document.querySelectorAll(".ent-name-select");
    const inputs = document.querySelectorAll(".ent-qty-input");
    let itemsPedidos = [];
    let granTotal = 0;
    let actualizacionesStock = [];

    for (let i = 0; i < selects.length; i++) {
        const name = selects[i].value;
        const qty = Number(inputs[i].value);
        if (name && qty > 0) {
            const prod = productosLocales.find(p => p.name === name);
            if (!prod || prod.stock < qty) {
                alert(`❌ No hay suficiente de ${name}`);
                return;
            }
            itemsPedidos.push({ name, qty, unitPrice: prod.sellPrice });
            granTotal += (qty * prod.sellPrice);
            actualizacionesStock.push({ id: prod.id, nuevoStock: prod.stock - qty });
        }
    }

    if (itemsPedidos.length === 0) return alert("Selecciona productos");

    try {
        await addDoc(entCol, {
            items: itemsPedidos,
            total: granTotal,
            whatsapp: document.getElementById("ent-wa").value,
            place: document.getElementById("ent-place").value,
            time: document.getElementById("ent-time").value
        });

        for (const act of actualizacionesStock) {
            await updateDoc(doc(db, "productos", act.id), { stock: act.nuevoStock });
        }
        e.target.reset();
        alert("✅ Entrega registrada");
    } catch (err) { alert("Error: " + err); }
});

// --- RENDERIZADO BODEGA ---
onSnapshot(invCol, (snapshot) => {
    const list = document.getElementById("list-inventario");
    const selects = document.querySelectorAll(".ent-name-select");
    list.innerHTML = "";
    productosLocales = [];
    let options = '<option value="">Producto...</option>';

    snapshot.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        productosLocales.push({...p, id});
        options += `<option value="${p.name}">${p.name} (${p.stock})</option>`;

        const isVisible = p.visible !== false;
        const eyeIcon = isVisible ? "👁️" : "🚫";
        const eyeColor = isVisible ? "#28a745" : "#666";

        list.innerHTML += `
            <div class="card verde">
                <div class="card-header">
                    <img src="${p.photo || 'https://via.placeholder.com/100'}" onclick="window.showBigPhoto('${p.photo}')">
                    <div>
                        <h2>${p.name}</h2>
                        <div class="price-tag-container">
                            <span class="price-tag">Compra: Q${p.buyPrice || 0}</span>
                            <span class="price-tag" style="background: #d4edda; color: #155724;">Venta: Q${p.sellPrice}</span>
                        </div>
                        <span style="font-weight: bold; font-size: 14px;">📦 Stock: ${p.stock}</span><br>
                        <small>${p.visible !== false ? "👁️ Público" : "🚫 Oculto"}</small>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-item" style="background: ${eyeColor}; color: white;" onclick="window.toggleVisibility('${id}', ${isVisible})">${eyeIcon}</button>
                    <button class="btn-item edit" onclick="window.editProduct('${id}', ${p.stock}, '${p.photo}')">✏️</button>
                    <button class="btn-item del" onclick="window.deleteItem('productos','${id}')">🗑️</button>
                </div>
            </div>`;
    });
    selects.forEach(s => s.innerHTML = options);
});

// --- RENDERIZADO ENTREGAS ---
onSnapshot(entCol, (snapshot) => {
    const list = document.getElementById("list-entregas");
    list.innerHTML = "";
    snapshot.forEach(docSnap => {
        const e = docSnap.data();
        const id = docSnap.id;
        const urgency = window.getUrgencyClass(e.time);
        let itemsHTML = e.items.map(i => `• ${i.qty} x ${i.name}`).join("<br>");

        list.innerHTML += `
            <div class="card ${urgency}">
                <div class="card-body" style="padding:15px">
                    <div style="font-weight:bold">${itemsHTML}</div>
                    <span class="total-pay">TOTAL: Q${e.total}</span>
                    <p>📍 ${e.place || 'Sin lugar'}</p>
                    <p>⏰ ${window.formatAMPM(e.time)}</p>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${e.whatsapp}" class="btn-item wa" target="_blank">💬</a>
                    <button class="btn-item edit" onclick="window.editDelivery('${id}')">📅</button>
                    <button class="btn-item del" onclick="window.deleteItem('entregas','${id}')">🗑️</button>
                </div>
            </div>`;
    });
});

// --- FUNCIONES GLOBALES ---
window.editProduct = async (id, oldStock, oldPhoto) => {
    const nuevoStock = prompt("Nuevo Stock:", oldStock);
    const nuevaPhoto = prompt("Nuevo Link de Foto (Deja en blanco para no cambiar):", oldPhoto);
    
    let updates = {};
    if (nuevoStock !== null) updates.stock = Number(nuevoStock);
    if (nuevaPhoto !== null && nuevaPhoto !== "") updates.photo = nuevaPhoto;

    if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "productos", id), updates);
    }
};

window.toggleVisibility = async (id, currentStatus) => {
    await updateDoc(doc(db, "productos", id), { visible: !currentStatus });
};

window.editDelivery = async (id) => {
    const nL = prompt("Nuevo lugar:");
    const nF = prompt("Nueva fecha (AAAA-MM-DD HH:MM):");
    if (nL || nF) await updateDoc(doc(db, "entregas", id), { place: nL, time: nF });
};

window.deleteItem = async (col, id) => {
    if(confirm("¿Eliminar definitivamente?")) await deleteDoc(doc(db, col, id));
};

window.getUrgencyClass = (dateStr) => {
    if (!dateStr) return "verde";
    const dif = (new Date(dateStr) - new Date()) / 3600000;
    return dif < 0 || dif <= 10 ? "rojo" : dif <= 48 ? "amarillo" : "verde";
};

window.formatAMPM = (dateStr) => {
    if (!dateStr) return "Sin fecha";
    return new Date(dateStr).toLocaleString();
};

window.showBigPhoto = (url) => {
    const modal = document.getElementById("photo-modal");
    document.getElementById("modal-img").src = url || 'https://via.placeholder.com/300';
    modal.style.display = "flex";
};




