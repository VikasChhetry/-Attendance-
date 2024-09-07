const firebaseConfig = {
    apiKey: "AIzaSyAp-MeVesHcyDnkrPw_b7_aXgnUIitNQzo",
    authDomain: "ticket-booking-bot-f11f8.firebaseapp.com",
    projectId: "ticket-booking-bot-f11f8",
    storageBucket: "ticket-booking-bot-f11f8.appspot.com",
    messagingSenderId: "260955012704",
    appId: "1:260955012704:web:40527047fac0506b1c4d05",
    measurementId: "G-QXD3VW3K6Y"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Razorpay configuration
const razorpayKeyId = 'rzp_test_tpN9fc8YwI3DJU';

// Chatbot elements
const chatMessages = document.getElementById('chat-messages');
const menuOptions = document.getElementById('menu-options');
const userInput = document.getElementById('user-message');
const sendButton = document.getElementById('send-button');



// Chatbot state
let currentState = 'MAIN_MENU';
let selectedMuseum = null;
let ticketQuantity = 0;

// Museum data
const museumData = {
    "national-museum": {
        name: "National Museum",
        price: 50,
        address: "Janpath Rd, Rajpath Area, Central Secretariat, New Delhi, Delhi 110001",
        information: "The National Museum, New Delhi is one of the largest museums in India. It holds a variety of articles ranging from pre-historic era to modern works of art.",
        ticketImage: "NationalMuseum.jpg"
    },
    "national-gallery-modern-art": {
        name: "National Gallery of Modern Art",
        price: 20,
        address: "Jaipur House, India Gate, New Delhi, Delhi 110003",
        information: "The National Gallery of Modern Art (NGMA) is the premier art gallery under the Ministry of Culture, Government of India. It has a vast collection of modern and contemporary Indian art.",
        ticketImage: "NationalMuseum.jpg"
    },
    "indira-gandhi-memorial-museum": {
        name: "Indira Gandhi Memorial Museum",
        price: 0,
        address: "1 Safdarjung Road, New Delhi, Delhi 110011",
        information: "The Indira Gandhi Memorial Museum was the residence of the former Prime Minister of India. It was converted into a museum after her assassination.",
        ticketImage: "NationalMuseum.jpg"
    }
};

// Add message to chat
function addMessage(message, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user-message' : 'bot-message');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show menu options
function showMenuOptions(options) {
    menuOptions.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.classList.add('menu-button');
        button.textContent = option.text;
        button.onclick = () => option.handler();
        menuOptions.appendChild(button);
    });
}

// Main menu
function showMainMenu() {
    currentState = 'MAIN_MENU';
    addMessage("Welcome to our Museum Booking Service. How may I assist you today?");
    showMenuOptions([
        { text: "🏛️ Explore Museums", handler: showMuseumList },
        { text: "📅 Book Tickets", handler: showMuseumList },
        { text: "ℹ️ Museum Information", handler: showInformation },
        { text: "📞 Contact Support", handler: showContactSupport }
    ]);
}

// Show museum list
function showMuseumList() {
    currentState = 'SELECT_MUSEUM';
    addMessage("Please select a museum from our esteemed collection:");
    showMenuOptions(
        Object.values(museumData).map(museum => ({
            text: `${museum.name} - ₹${museum.price}`,
            handler: () => selectMuseum(museum)
        }))
    );
}

// Select museum
function selectMuseum(museum) {
    selectedMuseum = museum;
    addMessage(`Excellent choice! You've selected ${museum.name}. The ticket price is ₹${museum.price} per person.`);
    showMenuOptions([
        { text: "📝 Book Tickets", handler: initiateBooking },
        { text: "ℹ️ More Information", handler: () => showMuseumInfo(museum) },
        { text: "🔙 Back to Museums", handler: showMuseumList }
    ]);
}

// Show museum information
function showMuseumInfo(museum) {
    addMessage(museum.information);
    addMessage(`Address: ${museum.address}`);
    showMenuOptions([
        { text: "📝 Book Tickets", handler: initiateBooking },
        { text: "🔙 Back to Museums", handler: showMuseumList }
    ]);
}

// Initiate booking
function initiateBooking() {
    currentState = 'ENTER_QUANTITY';
    addMessage("How many tickets would you like to book? Please enter a number or choose from the options below.");
    showMenuOptions([
        { text: "1 Ticket", handler: () => processBooking(1) },
        { text: "2 Tickets", handler: () => processBooking(2) },
        { text: "5 Tickets", handler: () => processBooking(5) },
        { text: "🔢 Custom Quantity", handler: enableCustomQuantityInput }
    ]);
}

// Enable custom quantity input
function enableCustomQuantityInput() {
    addMessage("Please enter the number of tickets you'd like to book:");
    userInput.style.display = 'block';
    sendButton.onclick = handleCustomQuantity;
}

// Handle custom quantity input
function handleCustomQuantity() {
    const quantity = parseInt(userInput.value);
    if (isNaN(quantity) || quantity <= 0) {
        addMessage("Please enter a valid number of tickets.");
    } else {
        processBooking(quantity);
    }
    userInput.style.display = 'none';
    sendButton.onclick = null;
}

// Process booking
function processBooking(quantity) {
    ticketQuantity = quantity;
    const totalPrice = selectedMuseum.price * quantity;
    addMessage(`Great! You're booking ${quantity} ticket(s) for ${selectedMuseum.name}. The total cost is ₹${totalPrice}.`);
    addMessage("Would you like to proceed with the payment?");
    showMenuOptions([
        { text: "💳 Pay Now", handler: initiatePayment },
        { text: "🔙 Change Quantity", handler: initiateBooking },
        { text: "❌ Cancel Booking", handler: showMainMenu }
    ]);
}

// Initiate Razorpay payment
function initiatePayment() {
    const totalAmount = selectedMuseum.price * ticketQuantity;
    const options = {
        key: razorpayKeyId,
        amount: totalAmount * 100, // Razorpay expects amount in paise
        currency: "INR",
        name: "Museum Ticket Booking",
        description: `Tickets for ${selectedMuseum.name}`,
        handler: function(response) {
            handlePaymentSuccess(response);
        },
        prefill: {
            name: "Visitor",
            email: "visitor@example.com"
        },
        theme: {
            color: "#007bff"
        }
    };
    const razorpayInstance = new Razorpay(options);
    razorpayInstance.open();
}

// Handle successful payment
function handlePaymentSuccess(response) {
    const bookingId = generateBookingId();
    const bookingDetails = {
        museum: selectedMuseum.name,
        tickets: ticketQuantity,
        totalPaid: selectedMuseum.price * ticketQuantity,
        transactionId: response.razorpay_payment_id,
        bookingId: bookingId,
        date: new Date().toLocaleString()
    };

    addMessage("Payment successful! Your booking is confirmed.");
    addMessage(`Booking Details:
    Museum: ${bookingDetails.museum}
    Tickets: ${bookingDetails.tickets}
    Total Paid: ₹${bookingDetails.totalPaid}
    Transaction ID: ${bookingDetails.transactionId}
    Booking ID: ${bookingDetails.bookingId}
    Date: ${bookingDetails.date}`);

    generateAndSendTicket(bookingDetails);

    // Store booking details in Firestore
    db.collection("bookings").add(bookingDetails)
        .then(() => console.log("Booking stored successfully"))
        .catch((error) => console.error("Error storing booking: ", error));

    showMainMenu();
}

// Generate a unique booking ID
function generateBookingId() {
    return 'BK' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Generate and send ticket
function generateAndSendTicket(bookingDetails) {
    // Create a canvas element to generate the ticket image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 300;

    // Load the base ticket image
    const img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Add booking details to the ticket
        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(`Museum: ${bookingDetails.museum}`, 50, 100);
        ctx.fillText(`Tickets: ${bookingDetails.tickets}`, 50, 130);
        ctx.fillText(`Booking ID: ${bookingDetails.bookingId}`, 50, 160);
        ctx.fillText(`Date: ${bookingDetails.date}`, 50, 190);

        // Convert canvas to image data URL
        const ticketDataUrl = canvas.toDataURL('image/jpeg');

        // Display the ticket in the chat
        addMessage("Here's your ticket:");
        const ticketImg = document.createElement('img');
        ticketImg.src = ticketDataUrl;
        ticketImg.style.maxWidth = '100%';
        chatMessages.appendChild(ticketImg);

        // Simulate sending the ticket via email
        addMessage("An email with your ticket has been sent to your registered email address.");
    };
    img.src = selectedMuseum.ticketImage;
}

// Show information
function showInformation() {
    addMessage("Our museums offer a rich cultural experience. Here are some key points:");
    addMessage("- Tickets can be booked online or purchased at the museum entrance.");
    addMessage("- We offer guided tours in multiple languages (subject to availability).");
    addMessage("- Special discounts are available for students and senior citizens.");
    addMessage("- For group bookings (10+ people), please contact our support team for special rates.");
    showMainMenu();
}

// Show contact support
function showContactSupport() {
    addMessage("Our support team is here to assist you. You can reach us through:");
    addMessage("📞 Phone: +91 11 2338 2338 (9 AM - 6 PM, Mon-Sat)");
    addMessage("📧 Email: support@delhimuseums.com");
    addMessage("💬 Live Chat: Available on our website www.delhimuseums.com");
    showMainMenu();
}

// Initialize the chatbot
function startChat() {
    addMessage("👋 Welcome to the Delhi Museums Booking Assistant! How may I help you today?");
    showMainMenu();
}

// Load Razorpay SDK
function loadRazorpaySDK() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        document.body.appendChild(script);
    });
}

// Start the chat after loading Razorpay SDK
loadRazorpaySDK().then(() => {
    startChat();
});