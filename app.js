const services=[
 {name:"Driving Licence",icon:"🚗",desc:"Apply, renew or update your driving licence.",query:"driving licence"},
 {name:"PAN Card",icon:"🪪",desc:"Apply for a PAN card or request corrections.",query:"pan card"},
 {name:"Passport",icon:"🛂",desc:"Apply or renew an Indian passport.",query:"passport"},
 {name:"Aadhaar",icon:"🆔",desc:"Find official Aadhaar services and guidance.",query:"aadhaar"},
 {name:"Income Certificate",icon:"📄",desc:"Understand requirements for income certificates.",query:"income certificate"},
 {name:"Voter ID",icon:"🗳️",desc:"Find voter registration and electoral services.",query:"voter id"},
 {name:"Vehicle Registration",icon:"🚙",desc:"Find official vehicle registration services.",query:"vehicle registration"},
 {name:"Udyam Registration",icon:"💼",desc:"Find official MSME/Udyam registration guidance.",query:"udyam registration"}
];
const grid=document.getElementById("serviceGrid");
grid.innerHTML=services.map(s=>`<button class="service-card" data-query="${s.query}"><div class="svc-icon">${s.icon}</div><h3>${s.name}</h3><p>${s.desc}</p><a>View guidance →</a></button>`).join("");
const modal=document.getElementById("modal"), title=document.getElementById("modalTitle"), text=document.getElementById("modalText");
function showModal(t,m){title.textContent=t;text.textContent=m;modal.showModal()}
function runSearch(q){document.getElementById("searchInput").value=q; document.getElementById("services").scrollIntoView({behavior:"smooth"}); showModal("Service finder",`We’ll use “${q}” as the search intent. In the full EazyGovt app, this will query the verified service database and return state-specific official portals.`)}
document.getElementById("searchBtn").onclick=()=>runSearch(document.getElementById("searchInput").value.trim()||"government service");
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("searchBtn").click()});
document.querySelectorAll("[data-query]").forEach(b=>b.onclick=()=>runSearch(b.dataset.query));
document.getElementById("loginBtn").onclick=()=>showModal("Login","Authentication is planned for the next build stage: email/password, email verification, phone OTP and Google sign-in.");
document.getElementById("signupBtn").onclick=()=>showModal("Create your EazyGovt account","Account creation will let users save services, track their guidance and receive reminders. Production authentication will be added after the core service directory.");
document.getElementById("ctaSignup").onclick=()=>document.getElementById("signupBtn").click();
document.getElementById("chatBtn").onclick=()=>showModal("EazyGovt AI Assistant","AI chat will help users describe what they need, identify the relevant service and guide them to verified official portals. It will not replace the government source.");
document.getElementById("missingBtn").onclick=()=>showModal("Suggest a service","In the full version, users will be able to submit a missing government service for verification and review.");
document.getElementById("locationBtn").onclick=()=>showModal("Location","The production version will use your selected state/district and, with permission, device location to prioritize relevant services and nearby government facilities.");
document.getElementById("mapBtn").onclick=()=>showModal("Government office locator","The location module will connect verified facility data with map directions. We’ll add the production map integration later.");
document.getElementById("exploreBtn").onclick=()=>document.getElementById("categories").scrollIntoView({behavior:"smooth"});
document.getElementById("closeModal").onclick=()=>modal.close();
document.getElementById("languageBtn").onclick=()=>showModal("Languages","EazyGovt is designed to support English, Hindi and additional Indian languages. Multilingual service guidance will be added in the accessibility phase.");
document.getElementById("themeBtn").onclick=()=>{document.body.classList.toggle("dark");document.getElementById("themeBtn").textContent=document.body.classList.contains("dark")?"🌙":"☀️"};
document.getElementById("menuBtn").onclick=()=>showModal("Navigation","Mobile navigation will include Services, Categories, States, Help, Login and your account.");

document.querySelectorAll(".category-grid button").forEach(b=>b.addEventListener("click",()=>{const label=b.querySelector("b")?.textContent||"category";showModal(label,`The full EazyGovt directory will filter services for ${label}. State and central services will be separated and official sources will be shown for each result.`)}));
document.querySelector(".outline")?.addEventListener("click",()=>document.getElementById("categories").scrollIntoView({behavior:"smooth"}));
document.querySelectorAll(".state-pills button").forEach(b=>b.addEventListener("click",()=>showModal("State selected",`${b.textContent} selected. The production search will prioritize services applicable to this state.`)));
