var services = [];

var grid = document.getElementById("serviceGrid");

var modal = document.getElementById("modal");
var modalTitle = document.getElementById("modalTitle");
var modalDescription = document.getElementById("modalDescription");
var modalIcon = document.getElementById("modalIcon");

var modalCategory = document.getElementById("modalCategory");
var modalDepartment = document.getElementById("modalDepartment");
var modalProcessing = document.getElementById("modalProcessing");
var modalFees = document.getElementById("modalFees");

var modalEligibility = document.getElementById("modalEligibility");
var modalDocuments = document.getElementById("modalDocuments");
var modalProcess = document.getElementById("modalProcess");

var modalPortalName = document.getElementById("modalPortalName");
var modalPortalLink = document.getElementById("modalPortalLink");

var modalNotes = document.getElementById("modalNotes");

var closeModal = document.getElementById("closeModal");


/* =========================================
   SERVICE ICONS
========================================= */

var serviceIcons = {
    "Driving Licence": "🚗",
    "PAN Card": "🪪",
    "Passport": "🛂",
    "Aadhaar Services": "🆔",
    "Voter ID Registration": "🗳️",
    "Udyam Registration": "💼",
    "Income Tax Services": "💰",
    "Education Services": "🎓"
};


/* =========================================
   SAFE TEXT
========================================= */

function safeText(value, fallback) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback || "";
    }

    return String(value);
}


/* =========================================
   LOAD SERVICES
========================================= */

function loadServices() {

    fetch("http://localhost:5000/api/services")

        .then(function(response) {

            if (!response.ok) {
                throw new Error(
                    "Server returned " +
                    response.status
                );
            }

            return response.json();
        })

        .then(function(data) {

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Unable to load services."
                );
            }

            services = data.services || [];

            renderServices();
        })

        .catch(function(error) {

            console.error(
                "Services API error:",
                error
            );

            if (grid) {

                grid.innerHTML =
                    '<div class="service-error">' +
                        '<h3>Unable to load services</h3>' +
                        '<p>Please make sure the EazyGovt backend is running.</p>' +
                    '</div>';
            }

        });
}


/* =========================================
   RENDER SERVICE CARDS
========================================= */

function renderServices() {

    if (!grid) {
        return;
    }

    if (services.length === 0) {

        grid.innerHTML =
            '<div class="service-error">' +
                '<h3>No services available</h3>' +
                '<p>The service catalogue is currently empty.</p>' +
            '</div>';

        return;
    }


    grid.innerHTML = "";


    services.forEach(function(service) {

        var button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "service-card";


        var icon =
            serviceIcons[
                service.service_name
            ] || "🏛️";


        button.innerHTML =
            '<div class="svc-icon">' +
                icon +
            '</div>' +

            '<h3>' +
                safeText(
                    service.service_name,
                    "Government Service"
                ) +
            '</h3>' +

            '<p>' +
                safeText(
                    service.description,
                    "Government service guidance."
                ) +
            '</p>' +

            '<span>View guidance →</span>';


        button.addEventListener(
            "click",
            function() {

                loadServiceDetails(
                    service.service_id
                );

            }
        );


        grid.appendChild(button);

    });
}


/* =========================================
   LOAD SERVICE DETAILS
========================================= */

function loadServiceDetails(serviceId) {

    fetch(
        "http://localhost:5000/api/services/" +
        serviceId
    )

        .then(function(response) {

            if (!response.ok) {

                throw new Error(
                    "Server returned " +
                    response.status
                );

            }

            return response.json();

        })

        .then(function(data) {

            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load service."
                );

            }

            displayService(
                data.service
            );

        })

        .catch(function(error) {

            console.error(
                "Service details error:",
                error
            );

            showSimpleModal(
                "Unable to load service",
                "We could not load the service information. Please make sure the EazyGovt backend is running."
            );

        });

}


/* =========================================
   DISPLAY SERVICE
========================================= */

function displayService(service) {

    if (!service) {

        showSimpleModal(
            "Service unavailable",
            "The requested service could not be found."
        );

        return;
    }


    /* ICON */

    if (modalIcon) {

        modalIcon.textContent =
            serviceIcons[
                service.service_name
            ] || "🏛️";

    }


    /* TITLE */

    if (modalTitle) {

        modalTitle.textContent =
            safeText(
                service.service_name,
                "Government Service"
            );

    }


    /* DESCRIPTION */

    if (modalDescription) {

        modalDescription.textContent =
            safeText(
                service.description,
                "Government service guidance."
            );

    }


    /* CATEGORY */

    if (modalCategory) {

        modalCategory.textContent =
            safeText(
                service.category,
                "Not specified"
            );

    }


    /* DEPARTMENT */

    if (modalDepartment) {

        modalDepartment.textContent =
            safeText(
                service.department,
                "Not specified"
            );

    }


    /* PROCESSING TIME */

    if (modalProcessing) {

        modalProcessing.textContent =
            safeText(
                service.processing_time,
                "Varies by service"
            );

    }


    /* FEES */

    if (modalFees) {

        modalFees.textContent =
            safeText(
                service.fees,
                "Varies by service"
            );

    }


    /* =====================================
       ELIGIBILITY
    ===================================== */

    if (modalEligibility) {

        modalEligibility.innerHTML = "";


        if (
            Array.isArray(
                service.eligibility
            ) &&
            service.eligibility.length > 0
        ) {

            service.eligibility.forEach(
                function(item) {

                    var element =
                        document.createElement("div");

                    element.className =
                        "requirement-item";

                    element.textContent =
                        "• " +
                        safeText(
                            item.condition_text,
                            "Eligibility requirement"
                        );

                    modalEligibility.appendChild(
                        element
                    );

                }
            );

        } else {

            modalEligibility.innerHTML =
                "<p>Eligibility information is not currently available. Please verify the latest requirements on the official portal.</p>";

        }

    }


    /* =====================================
       DOCUMENTS
    ===================================== */

    if (modalDocuments) {

        modalDocuments.innerHTML = "";


        if (
            Array.isArray(
                service.documents
            ) &&
            service.documents.length > 0
        ) {

            service.documents.forEach(
                function(item) {

                    var element =
                        document.createElement("div");

                    element.className =
                        "document-item";


                    var name =
                        safeText(
                            item.name,
                            "Document"
                        );


                    var requirement =
                        safeText(
                            item.requirement_type,
                            "Check official requirements"
                        );


                    var strong =
                        document.createElement(
                            "strong"
                        );

                    strong.textContent =
                        name;


                    var badge =
                        document.createElement(
                            "span"
                        );

                    badge.textContent =
                        requirement;


                    element.appendChild(
                        strong
                    );

                    element.appendChild(
                        badge
                    );


                    if (item.notes) {

                        var note =
                            document.createElement(
                                "small"
                            );

                        note.textContent =
                            item.notes;

                        element.appendChild(
                            note
                        );

                    }


                    modalDocuments.appendChild(
                        element
                    );

                }
            );

        } else {

            modalDocuments.innerHTML =
                "<p>Document requirements are not currently available. Please verify them on the official portal.</p>";

        }

    }


    /* =====================================
       APPLICATION PROCESS
    ===================================== */

    if (modalProcess) {

        modalProcess.textContent =
            safeText(
                service.application_process,
                "Follow the instructions provided on the official government portal."
            );

    }


    /* =====================================
       IMPORTANT NOTES
    ===================================== */

    if (modalNotes) {

        modalNotes.textContent =
            safeText(
                service.important_notes,
                "Always verify the latest requirements, fees and process on the official government portal."
            );

    }


    /* =====================================
       OFFICIAL PORTAL
    ===================================== */

    if (modalPortalName) {

        modalPortalName.textContent =
            "Official Government Portal";

    }


    if (modalPortalLink) {

        modalPortalLink.href =
            "#";


        modalPortalLink.onclick =
            function(event) {

                event.preventDefault();


                if (
                    Array.isArray(
                        service.official_portals
                    ) &&
                    service.official_portals.length > 0
                ) {

                    var portal =
                        service.official_portals[0];


                    if (portal.url) {

                        window.open(
                            portal.url,
                            "_blank"
                        );

                        return;
                    }

                }


                alert(
                    "The official portal has not been added yet."
                );

            };


        if (
            Array.isArray(
                service.official_portals
            ) &&
            service.official_portals.length > 0
        ) {

            var firstPortal =
                service.official_portals[0];


            if (firstPortal.name) {

                modalPortalName.textContent =
                    firstPortal.name;

            }


            if (firstPortal.url) {

                modalPortalLink.href =
                    firstPortal.url;

            }

        }

    }


    /* =====================================
       OPEN MODAL
    ===================================== */

    if (modal) {

        modal.showModal();

    }

}


/* =========================================
   SIMPLE MODAL
========================================= */

function showSimpleModal(
    heading,
    message
) {

    if (modalTitle) {

        modalTitle.textContent =
            heading;

    }


    if (modalIcon) {

        modalIcon.textContent =
            "ℹ️";

    }


    if (modalDescription) {

        modalDescription.textContent =
            message;

    }


    if (modalCategory) {
        modalCategory.textContent = "—";
    }

    if (modalDepartment) {
        modalDepartment.textContent = "—";
    }

    if (modalProcessing) {
        modalProcessing.textContent = "—";
    }

    if (modalFees) {
        modalFees.textContent = "—";
    }


    if (modalEligibility) {
        modalEligibility.innerHTML = "";
    }

    if (modalDocuments) {
        modalDocuments.innerHTML = "";
    }

    if (modalProcess) {
        modalProcess.textContent = "";
    }


    if (modalPortalName) {

        modalPortalName.textContent =
            "Official Portal";

    }


    if (modalPortalLink) {

        modalPortalLink.href = "#";

        modalPortalLink.onclick =
            function(event) {

                event.preventDefault();

            };

    }


    if (modalNotes) {

        modalNotes.textContent = "";

    }


    if (modal) {

        modal.showModal();

    }

}


/* =========================================
   SEARCH
========================================= */

function runSearch(query) {

    var searchQuery =
        safeText(
            query,
            ""
        ).trim();


    if (!searchQuery) {

        searchQuery =
            "government service";

    }


    var input =
        document.getElementById(
            "searchInput"
        );


    if (input) {

        input.value =
            searchQuery;

    }


    var servicesSection =
        document.getElementById(
            "services"
        );


    if (servicesSection) {

        servicesSection.scrollIntoView({
            behavior: "smooth"
        });

    }


    var searchLower =
        searchQuery.toLowerCase();


    var match =
        services.find(
            function(service) {

                var name =
                    safeText(
                        service.service_name,
                        ""
                    ).toLowerCase();


                var description =
                    safeText(
                        service.description,
                        ""
                    ).toLowerCase();


                var category =
                    safeText(
                        service.category,
                        ""
                    ).toLowerCase();


                return (
                    name.includes(searchLower) ||
                    description.includes(searchLower) ||
                    category.includes(searchLower)
                );

            }
        );


    if (match) {

        loadServiceDetails(
            match.service_id
        );

    } else {

        showSimpleModal(
            "Service not found",
            "We could not find a matching service in the current EazyGovt catalogue."
        );

    }

}


/* =========================================
   SEARCH BUTTON
========================================= */

var searchBtn =
    document.getElementById(
        "searchBtn"
    );


if (searchBtn) {

    searchBtn.onclick =
        function() {

            var input =
                document.getElementById(
                    "searchInput"
                );


            runSearch(
                input
                    ? input.value
                    : ""
            );

        };

}


/* =========================================
   SEARCH ENTER
========================================= */

var searchInput =
    document.getElementById(
        "searchInput"
    );


if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                runSearch(
                    searchInput.value
                );

            }

        }
    );

}


/* =========================================
   CLOSE MODAL
========================================= */

if (closeModal) {

    closeModal.onclick =
        function() {

            if (modal) {

                modal.close();

            }

        };

}


/* =========================================
   LOGIN
========================================= */

var loginBtn =
    document.getElementById("loginBtn");


if (loginBtn) {

    loginBtn.onclick = function () {

        var existing =
            document.getElementById("authModal");


        if (existing) {

            existing.remove();

        }


        var authModal =
            document.createElement("div");


        authModal.id =
            "authModal";


        authModal.innerHTML =
            '<div class="auth-modal-overlay">' +

                '<div class="auth-modal-card">' +

                    '<button class="auth-close" id="authClose" aria-label="Close">' +
                        '×' +
                    '</button>' +

                    '<div class="auth-brand">' +

                        '<div class="auth-brand-icon">🏛️</div>' +

                        '<div>' +

                            '<strong>EazyGovt</strong>' +

                            '<span>Government Services, Made Easy.</span>' +

                        '</div>' +

                    '</div>' +

                    '<div class="auth-header">' +

                        '<p class="auth-eyebrow">WELCOME BACK</p>' +

                        '<h2>Login to your account</h2>' +

                        '<p>' +
                            'Continue your government-service journey with EazyGovt.' +
                        '</p>' +

                    '</div>' +

                    '<form id="loginForm" class="auth-form">' +

                        '<div class="auth-field">' +

                            '<label for="loginEmail">Email address</label>' +

                            '<input ' +
                                'type="email" ' +
                                'id="loginEmail" ' +
                                'placeholder="you@example.com" ' +
                                'autocomplete="email" ' +
                                'required' +
                            '>' +

                        '</div>' +

                        '<div class="auth-field">' +

                            '<div class="auth-label-row">' +

                                '<label for="loginPassword">Password</label>' +

                                '<button type="button" id="toggleLoginPassword" class="password-toggle">' +
                                    'Show' +
                                '</button>' +

                            '</div>' +

                            '<input ' +
                                'type="password" ' +
                                'id="loginPassword" ' +
                                'placeholder="Enter your password" ' +
                                'autocomplete="current-password" ' +
                                'required' +
                            '>' +

                        '</div>' +

                        '<button type="submit" class="btn primary auth-submit" id="loginSubmit">' +
                            'Login securely' +
                        '</button>' +

                        '<p id="loginMessage" class="auth-message"></p>' +

                    '</form>' +

                    '<div class="auth-security-note">' +

                        '<span>🔒</span>' +

                        '<p>Your password is securely verified by the EazyGovt backend.</p>' +

                    '</div>' +

                '</div>' +

            '</div>';


        document.body.appendChild(authModal);


        var authClose =
            document.getElementById("authClose");


        var loginForm =
            document.getElementById("loginForm");


        var loginMessage =
            document.getElementById("loginMessage");


        var loginPassword =
            document.getElementById("loginPassword");


        var toggleLoginPassword =
            document.getElementById("toggleLoginPassword");


        var loginSubmit =
            document.getElementById("loginSubmit");


        authClose.onclick = function () {

            authModal.remove();

        };


        authModal.onclick = function (event) {

            if (event.target === authModal) {

                authModal.remove();

            }

        };


        toggleLoginPassword.onclick = function () {

            if (loginPassword.type === "password") {

                loginPassword.type = "text";

                toggleLoginPassword.textContent =
                    "Hide";

            } else {

                loginPassword.type = "password";

                toggleLoginPassword.textContent =
                    "Show";

            }

        };


        loginForm.onsubmit = async function (event) {

            event.preventDefault();


            var email =
                document.getElementById("loginEmail")
                    .value
                    .trim();


            var password =
                loginPassword.value;


            loginMessage.textContent =
                "Signing you in...";


            loginMessage.className =
                "auth-message";


            loginSubmit.disabled = true;

            loginSubmit.textContent =
                "Signing in...";


            try {

                var response = await fetch(
                    "http://localhost:5000/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );


                var data =
                    await response.json();


                if (!response.ok) {

                    loginMessage.textContent =
                        data.message ||
                        "Unable to log in.";


                    loginMessage.className =
                        "auth-message error";


                    loginSubmit.disabled =
                        false;


                    loginSubmit.textContent =
                        "Login securely";


                    return;

                }


                localStorage.setItem(
                    "eazyGovtToken",
                    data.token
                );


                localStorage.setItem(
                    "eazyGovtUser",
                    JSON.stringify(data.user)
                );


                loginMessage.textContent =
                    "Login successful!";


                loginMessage.className =
                    "auth-message success";


                updateLoggedInHeader(
                    data.user
                );


                setTimeout(function () {

                    authModal.remove();

                }, 900);


            } catch (error) {

                console.error(
                    "Login request error:",
                    error
                );


                loginMessage.textContent =
                    "Unable to connect to EazyGovt server.";


                loginMessage.className =
                    "auth-message error";


                loginSubmit.disabled =
                    false;


                loginSubmit.textContent =
                    "Login securely";

            }

        };

    };

}

/* =========================================
   LOGGED-IN USER HEADER
========================================= */

function updateLoggedInHeader(user) {

    var loginButton =
        document.getElementById("loginBtn");

    var signupButton =
        document.getElementById("signupBtn");


    if (!loginButton || !user) {
        return;
    }


    loginButton.textContent =
        "Hi, " +
        user.name.split(" ")[0];


    loginButton.className =
        "btn secondary logged-in-user";


    loginButton.onclick =
        function () {

            showUserProfile();

        };


    if (signupButton) {

        signupButton.textContent =
            "Logout";


        signupButton.className =
            "btn primary";


        signupButton.onclick =
            function () {

                localStorage.removeItem(
                    "eazyGovtToken"
                );

                localStorage.removeItem(
                    "eazyGovtUser"
                );


                loginButton.textContent =
                    "Login";


                loginButton.className =
                    "btn secondary";


                signupButton.textContent =
                    "Sign Up";


                signupButton.className =
                    "btn primary";


                loginButton.onclick =
                    function () {

                        location.reload();

                    };


                signupButton.onclick =
                    function () {

                        location.reload();

                    };

            };

    }

}


/* =========================================
   USER PROFILE
========================================= */

function showUserProfile() {

    var userData =
        localStorage.getItem(
            "eazyGovtUser"
        );


    if (!userData) {
        return;
    }


    var user =
        JSON.parse(userData);


    var existing =
        document.getElementById(
            "profileModal"
        );


    if (existing) {
        existing.remove();
    }


    var profileModal =
        document.createElement(
            "div"
        );


    profileModal.id =
        "profileModal";


    profileModal.innerHTML =
        '<div class="auth-modal-overlay">' +

            '<div class="profile-card">' +

                '<button class="auth-close" id="profileClose">' +
                    '×' +
                '</button>' +

                '<div class="profile-avatar">' +
                    user.name
                        .charAt(0)
                        .toUpperCase() +
                '</div>' +

                '<p class="auth-eyebrow">MY ACCOUNT</p>' +

                '<h2>' +
                    user.name +
                '</h2>' +

                '<p class="profile-email">' +
                    user.email +
                '</p>' +

                '<div class="profile-info">' +

                    '<div>' +

                        '<span>ACCOUNT</span>' +

                        '<strong>Active</strong>' +

                    '</div>' +

                    '<div>' +

                        '<span>MEMBER ID</span>' +

                        '<strong>#' +
                            user.user_id +
                        '</strong>' +

                    '</div>' +

                '</div>' +

                '<div class="profile-coming-soon">' +

                    '<strong>Your EazyGovt dashboard is coming next.</strong>' +

                    '<p>' +
                        'Saved services, application tracking and personalised government-service guidance will appear here.' +
                    '</p>' +

                '</div>' +

            '</div>' +

        '</div>';


    document.body.appendChild(
        profileModal
    );


    document
        .getElementById("profileClose")
        .onclick =
        function () {

            profileModal.remove();

        };


    profileModal.onclick =
        function (event) {

            if (
                event.target ===
                profileModal
            ) {

                profileModal.remove();

            }

        };

}


/* =========================================
   SIGN UP
========================================= */

var signupBtn =
    document.getElementById(
        "signupBtn"
    );


if (signupBtn) {

    signupBtn.onclick =
        function () {

            var existing =
                document.getElementById(
                    "authModal"
                );


            if (existing) {
                existing.remove();
            }


            var authModal =
                document.createElement(
                    "div"
                );


            authModal.id =
                "authModal";


            authModal.innerHTML =
                '<div class="auth-modal-overlay">' +

                    '<div class="auth-modal-card">' +

                        '<button class="auth-close" id="authClose">' +
                            '×' +
                        '</button>' +

                        '<div class="auth-header">' +

                            '<div class="auth-icon">👤</div>' +

                            '<p class="auth-eyebrow">CREATE ACCOUNT</p>' +

                            '<h2>Create your EazyGovt account</h2>' +

                            '<p>Save services and manage your government-service journey in one place.</p>' +

                        '</div>' +

                        '<form id="signupForm">' +

                            '<label for="signupName">Full name</label>' +

                            '<input ' +
                                'type="text" ' +
                                'id="signupName" ' +
                                'placeholder="Enter your full name" ' +
                                'required' +
                            '>' +

                            '<label for="signupEmail">Email address</label>' +

                            '<input ' +
                                'type="email" ' +
                                'id="signupEmail" ' +
                                'placeholder="Enter your email" ' +
                                'required' +
                            '>' +

                            '<label for="signupPassword">Password</label>' +

                            '<input ' +
                                'type="password" ' +
                                'id="signupPassword" ' +
                                'placeholder="At least 8 characters" ' +
                                'required ' +
                                'minlength="8"' +
                            '>' +

                            '<button type="submit" class="btn primary auth-submit">' +
                                'Create Account' +
                            '</button>' +

                            '<p id="signupMessage" class="auth-message"></p>' +

                        '</form>' +

                    '</div>' +

                '</div>';


            document.body.appendChild(
                authModal
            );


            var authClose =
                document.getElementById(
                    "authClose"
                );


            var signupForm =
                document.getElementById(
                    "signupForm"
                );


            var signupMessage =
                document.getElementById(
                    "signupMessage"
                );


            authClose.onclick =
                function () {

                    authModal.remove();

                };


            authModal.onclick =
                function (event) {

                    if (
                        event.target ===
                        authModal
                    ) {

                        authModal.remove();

                    }

                };


            signupForm.onsubmit =
                async function (event) {

                    event.preventDefault();


                    var name =
                        document
                            .getElementById(
                                "signupName"
                            )
                            .value
                            .trim();


                    var email =
                        document
                            .getElementById(
                                "signupEmail"
                            )
                            .value
                            .trim();


                    var password =
                        document
                            .getElementById(
                                "signupPassword"
                            )
                            .value;


                    signupMessage.textContent =
                        "Creating your account...";


                    try {

                        var response =
                            await fetch(
                                "http://localhost:5000/api/auth/signup",
                                {
                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify({
                                            name: name,
                                            email: email,
                                            password: password
                                        })
                                }
                            );


                        var data =
                            await response.json();


                        if (!response.ok) {

                            signupMessage.textContent =
                                data.message ||
                                "Unable to create account.";

                            return;

                        }


                        signupMessage.textContent =
                            "Account created successfully! You can now log in.";


                        signupForm.reset();

                    } catch (error) {

                        console.error(
                            "Signup request error:",
                            error
                        );


                        signupMessage.textContent =
                            "Unable to connect to EazyGovt server.";

                    }

                };

        };

}


/* =========================================
   CTA SIGN UP
========================================= */

var ctaSignup =
    document.getElementById(
        "ctaSignup"
    );


if (ctaSignup) {

    ctaSignup.onclick =
        function () {

            if (signupBtn) {

                signupBtn.click();

            }

        };

}


/* =========================================
   EAZY GOVT AI ASSISTANT
========================================= */

var chatBtn =
    document.getElementById(
        "chatBtn"
    );


if (chatBtn) {

    chatBtn.onclick =
        function () {

            var existingChat =
                document.getElementById(
                    "aiChatModal"
                );


            if (existingChat) {
                existingChat.remove();
            }


            /* -----------------------------------------
               AI ASSISTANT STYLES
            ----------------------------------------- */

            if (
                !document.getElementById(
                    "eazyGovtAIStyles"
                )
            ) {

                var style =
                    document.createElement(
                        "style"
                    );


                style.id =
                    "eazyGovtAIStyles";


                style.textContent =

                    ".eazy-ai-card {" +

                        "width: min(760px, 94vw);" +

                        "max-height: 88vh;" +

                        "overflow: hidden;" +

                        "display: flex;" +

                        "flex-direction: column;" +

                    "}" +

                    ".eazy-ai-top {" +

                        "display: flex;" +

                        "align-items: center;" +

                        "justify-content: space-between;" +

                        "gap: 16px;" +

                        "padding-bottom: 18px;" +

                        "border-bottom: 1px solid rgba(0,0,0,.08);" +

                    "}" +

                    ".eazy-ai-brand {" +

                        "display: flex;" +

                        "align-items: center;" +

                        "gap: 12px;" +

                    "}" +

                    ".eazy-ai-avatar {" +

                        "width: 52px;" +

                        "height: 52px;" +

                        "border-radius: 16px;" +

                        "display: grid;" +

                        "place-items: center;" +

                        "font-size: 26px;" +

                        "background: #eef3ff;" +

                    "}" +

                    ".eazy-ai-brand strong {" +

                        "display: block;" +

                        "font-size: 18px;" +

                    "}" +

                    ".eazy-ai-brand span {" +

                        "display: block;" +

                        "font-size: 13px;" +

                        "opacity: .65;" +

                        "margin-top: 3px;" +

                    "}" +

                    ".eazy-ai-reset {" +

                        "border: 0;" +

                        "background: transparent;" +

                        "font-size: 13px;" +

                        "cursor: pointer;" +

                        "opacity: .7;" +

                        "padding: 8px;" +

                    "}" +

                    ".eazy-ai-body {" +

                        "overflow-y: auto;" +

                        "padding: 24px 2px;" +

                    "}" +

                    ".eazy-ai-title {" +

                        "font-size: 30px;" +

                        "line-height: 1.15;" +

                        "margin: 0 0 8px;" +

                    "}" +

                    ".eazy-ai-subtitle {" +

                        "margin: 0 0 24px;" +

                        "opacity: .68;" +

                    "}" +

                    ".eazy-ai-section-title {" +

                        "font-size: 13px;" +

                        "font-weight: 700;" +

                        "letter-spacing: .05em;" +

                        "text-transform: uppercase;" +

                        "opacity: .55;" +

                        "margin: 22px 0 10px;" +

                    "}" +

                    ".eazy-ai-actions {" +

                        "display: grid;" +

                        "grid-template-columns: repeat(2, minmax(0, 1fr));" +

                        "gap: 10px;" +

                    "}" +

                    ".eazy-ai-action {" +

                        "text-align: left;" +

                        "border: 1px solid rgba(0,0,0,.1);" +

                        "background: rgba(255,255,255,.7);" +

                        "border-radius: 15px;" +

                        "padding: 15px;" +

                        "cursor: pointer;" +

                        "transition: transform .15s ease, border-color .15s ease;" +

                    "}" +

                    ".eazy-ai-action:hover {" +

                        "transform: translateY(-2px);" +

                        "border-color: #315efb;" +

                    "}" +

                    ".eazy-ai-action strong {" +

                        "display: block;" +

                        "font-size: 15px;" +

                        "margin-bottom: 4px;" +

                    "}" +

                    ".eazy-ai-action span {" +

                        "font-size: 12px;" +

                        "opacity: .6;" +

                    "}" +

                    ".eazy-ai-messages {" +

                        "display: flex;" +

                        "flex-direction: column;" +

                        "gap: 12px;" +

                        "margin-bottom: 18px;" +

                    "}" +

                    ".eazy-ai-message {" +

                        "max-width: 88%;" +

                        "padding: 13px 15px;" +

                        "border-radius: 16px;" +

                        "line-height: 1.5;" +

                        "font-size: 14px;" +

                    "}" +

                    ".eazy-ai-assistant {" +

                        "align-self: flex-start;" +

                        "background: #f3f5f8;" +

                        "border-bottom-left-radius: 5px;" +

                    "}" +

                    ".eazy-ai-user {" +

                        "align-self: flex-end;" +

                        "background: #315efb;" +

                        "color: white;" +

                        "border-bottom-right-radius: 5px;" +

                    "}" +

                    ".eazy-ai-form {" +

                        "display: flex;" +

                        "gap: 9px;" +

                        "padding-top: 14px;" +

                        "border-top: 1px solid rgba(0,0,0,.08);" +

                    "}" +

                    ".eazy-ai-input {" +

                        "flex: 1;" +

                        "min-width: 0;" +

                        "border: 1px solid rgba(0,0,0,.14);" +

                        "border-radius: 13px;" +

                        "padding: 13px 15px;" +

                        "font-size: 16px;" +

                        "outline: none;" +

                    "}" +

                    ".eazy-ai-input:focus {" +

                        "border-color: #315efb;" +

                        "box-shadow: 0 0 0 3px rgba(49,94,251,.1);" +

                    "}" +

                    ".eazy-ai-note {" +

                        "font-size: 11px;" +

                        "opacity: .58;" +

                        "margin-top: 14px;" +

                        "line-height: 1.5;" +

                    "}" +

                    "@media (max-width: 600px) {" +

                        ".eazy-ai-card {" +

                            "width: 96vw;" +

                        "}" +

                        ".eazy-ai-actions {" +

                            "grid-template-columns: 1fr;" +

                        "}" +

                        ".eazy-ai-title {" +

                            "font-size: 25px;" +

                        "}" +

                        ".eazy-ai-form {" +

                            "flex-direction: column;" +

                        "}" +

                    "}";


                document.head.appendChild(
                    style
                );

            }


            /* -----------------------------------------
               CREATE AI MODAL
            ----------------------------------------- */

            var aiModal =
                document.createElement(
                    "div"
                );


            aiModal.id =
                "aiChatModal";


            aiModal.className =
                "auth-modal-overlay";


            aiModal.innerHTML =

                '<div class="auth-modal-card eazy-ai-card">' +

                    '<div class="eazy-ai-top">' +

                        '<div class="eazy-ai-brand">' +

                            '<div class="eazy-ai-avatar">' +
                                '🤖' +
                            '</div>' +

                            '<div>' +

                                '<strong>EazyGovt AI</strong>' +

                                '<span>Government Service Navigator</span>' +

                            '</div>' +

                        '</div>' +

                        '<button ' +
                            'type="button" ' +
                            'class="auth-close" ' +
                            'id="closeAIChat"' +
                        '>' +
                            '×' +
                        '</button>' +

                    '</div>' +

                    '<div class="eazy-ai-body">' +

                        '<div id="aiHome">' +

                            '<h2 class="eazy-ai-title">' +
                                'What can I help you with?' +
                            '</h2>' +

                            '<p class="eazy-ai-subtitle">' +
                                'Tell me what you want to do. I’ll help you find the right government service.' +
                            '</p>' +

                            '<div class="eazy-ai-section-title">' +
                                'Start with a task' +
                            '</div>' +

                            '<div class="eazy-ai-actions">' +

                                '<button class="eazy-ai-action" data-ai-action="apply" type="button">' +
                                    '<strong>🚀 Apply for a service</strong>' +
                                    '<span>Find the right government service</span>' +
                                '</button>' +

                                '<button class="eazy-ai-action" data-ai-action="renew" type="button">' +
                                    '<strong>🔄 Renew something</strong>' +
                                    '<span>Find renewal-related services</span>' +
                                '</button>' +

                                '<button class="eazy-ai-action" data-ai-action="documents" type="button">' +
                                    '<strong>📄 Find documents</strong>' +
                                    '<span>See what you may need</span>' +
                                '</button>' +

                                '<button class="eazy-ai-action" data-ai-action="eligibility" type="button">' +
                                    '<strong>✅ Check eligibility</strong>' +
                                    '<span>Understand basic requirements</span>' +
                                '</button>' +

                            '</div>' +

                            '<div class="eazy-ai-section-title">' +
                                'Or ask in your own words' +
                            '</div>' +

                        '</div>' +

                        '<div id="aiChatMessages" class="eazy-ai-messages"></div>' +

                        '<form id="aiChatForm" class="eazy-ai-form">' +

                            '<input ' +
                                'type="text" ' +
                                'id="aiChatInput" ' +
                                'class="eazy-ai-input" ' +
                                'placeholder="e.g. I want to renew my driving licence"' +
                                ' autocomplete="off"' +
                            '>' +

                            '<button ' +
                                'type="submit" ' +
                                'class="btn primary"' +
                            '>' +
                                'Ask AI →' +
                            '</button>' +

                        '</form>' +

                        '<div class="eazy-ai-note">' +
                            'EazyGovt is an independent platform. Final requirements and decisions belong to the relevant official government authority.' +
                        '</div>' +

                    '</div>' +

                '</div>';


            document.body.appendChild(
                aiModal
            );


            var closeAIChat =
                document.getElementById(
                    "closeAIChat"
                );


            var aiForm =
                document.getElementById(
                    "aiChatForm"
                );


            var aiInput =
                document.getElementById(
                    "aiChatInput"
                );


            var aiMessages =
                document.getElementById(
                    "aiChatMessages"
                );


            var aiHome =
                document.getElementById(
                    "aiHome"
                );


            /* -----------------------------------------
               CLOSE AI
            ----------------------------------------- */

            closeAIChat.onclick =
                function () {

                    aiModal.remove();

                };


            aiModal.onclick =
                function (event) {

                    if (
                        event.target ===
                        aiModal
                    ) {

                        aiModal.remove();

                    }

                };


            /* -----------------------------------------
               ADD MESSAGE
            ----------------------------------------- */

            function addMessage(
                text,
                type
            ) {

                var message =
                    document.createElement(
                        "div"
                    );


                message.className =
                    "eazy-ai-message " +
                    (
                        type === "user"
                            ? "eazy-ai-user"
                            : "eazy-ai-assistant"
                    );


                message.textContent =
                    text;


                aiMessages.appendChild(
                    message
                );


                aiMessages.scrollTop =
                    aiMessages.scrollHeight;


                return message;

            }


            /* -----------------------------------------
               REAL EAZY GOVT AI BACKEND
            ----------------------------------------- */

            function handleQuestion(
                question
            ) {

                if (
                    !question ||
                    !question.trim()
                ) {

                    return;

                }


                aiHome.style.display =
                    "none";


                addMessage(
                    question,
                    "user"
                );


                var thinking =
                    addMessage(
                        "🤖 EazyGovt AI is thinking...",
                        "assistant"
                    );


                fetch(
                    "http://localhost:5000/api/ai/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                message:
                                    question.trim()
                            })
                    }
                )

                .then(function(response) {

                    if (!response.ok) {

                        throw new Error(
                            "AI request failed: " +
                            response.status
                        );

                    }


                    return response.json();

                })

                .then(function(data) {

                    thinking.remove();


                    if (
                        data.success &&
                        data.reply
                    ) {

                        addMessage(
                            data.reply,
                            "assistant"
                        );

                    } else {

                        addMessage(
                            "I couldn't generate a response right now. Please try again.",
                            "assistant"
                        );

                    }

                })

                .catch(function(error) {

                    console.error(
                        "EazyGovt AI error:",
                        error
                    );


                    thinking.textContent =
                        "The AI assistant is temporarily unavailable. Please make sure the EazyGovt backend is running and your API account has available credits.";

                });

            }


            /* -----------------------------------------
               QUICK ACTIONS
            ----------------------------------------- */

            var actionButtons =
                document.querySelectorAll(
                    "[data-ai-action]"
                );


            actionButtons.forEach(
                function(button) {

                    button.onclick =
                        function() {

                            var action =
                                button.getAttribute(
                                    "data-ai-action"
                                );


                            var prompts = {

                                apply:
                                    "I want to apply for a government service. Help me find the right service and ask me any important questions you need.",

                                renew:
                                    "I want to renew a government document or service. Help me identify what I need to renew and what information you need from me.",

                                documents:
                                    "I want to know which documents I need for a government service. Ask me which service I need help with.",

                                eligibility:
                                    "I want to check my eligibility for a government service. Ask me which service I am interested in and what information you need."

                            };


                            handleQuestion(
                                prompts[action]
                            );


                            aiInput.focus();

                        };

                }
            );


            /* -----------------------------------------
               AI FORM
            ----------------------------------------- */

            aiForm.onsubmit =
                function(event) {

                    event.preventDefault();


                    var question =
                        aiInput.value.trim();


                    if (!question) {

                        aiInput.focus();

                        return;

                    }


                    aiInput.value =
                        "";


                    handleQuestion(
                        question
                    );

                };


            /* -----------------------------------------
               START AI
            ----------------------------------------- */

            aiInput.focus();

        };

}

/* =========================================
   LOCATION BUTTON
========================================= */

var locationBtn =
    document.getElementById(
        "locationBtn"
    );


if (locationBtn) {

    locationBtn.onclick =
        function () {

            showSimpleModal(
                "Choose Your Location",
                "Select your state and district to prioritise relevant government services for your area."
            );

        };

}


/* =========================================
   MAP BUTTON
========================================= */

var mapBtn =
    document.getElementById(
        "mapBtn"
    );


if (mapBtn) {

    mapBtn.onclick =
        function () {

            showSimpleModal(
                "Service Map",
                "The EazyGovt service map will help you discover government offices and services near your location."
            );

        };

}


/* =========================================
   LANGUAGE BUTTON
========================================= */

var languageBtn =
    document.getElementById(
        "languageBtn"
    );


if (languageBtn) {

    languageBtn.onclick =
        function () {

            showSimpleModal(
                "Choose Language",
                "Multi-language government-service guidance will be available here."
            );

        };

}


/* =========================================
   THEME TOGGLE
========================================= */

var themeBtn =
    document.getElementById(
        "themeBtn"
    );


if (themeBtn) {

    themeBtn.onclick =
        function () {

            document.body.classList.toggle(
                "dark"
            );


            if (
                document.body.classList.contains(
                    "dark"
                )
            ) {

                themeBtn.textContent =
                    "☀️";

            } else {

                themeBtn.textContent =
                    "🌙";

            }

        };

}


/* =========================================
   MOBILE MENU
========================================= */

var mobileMenuBtn =
    document.getElementById(
        "mobileMenuBtn"
    );


if (mobileMenuBtn) {

    mobileMenuBtn.onclick =
        function () {

            showSimpleModal(
                "Menu",
                "Mobile navigation options will appear here as the EazyGovt platform expands."
            );

        };

}


/* =========================================
   EXPLORE SERVICES BUTTON
========================================= */

var exploreBtn =
    document.getElementById(
        "exploreBtn"
    );


if (exploreBtn) {

    exploreBtn.onclick =
        function () {

            var categories =
                document.getElementById(
                    "categories"
                );


            if (categories) {

                categories.scrollIntoView({
                    behavior: "smooth"
                });

            }

        };

}


/* =========================================
   CATEGORY BUTTONS
========================================= */

var categoryButtons =
    document.querySelectorAll(
        ".category-grid button"
    );


categoryButtons.forEach(
    function(button) {

        button.onclick =
            function() {

                var categoryName =
                    button.textContent.trim();


                showSimpleModal(
                    categoryName,
                    "Services from this category will appear here. You can also use EazyGovt AI to find the exact government service you need."
                );

            };

    }
);


/* =========================================
   STATE BUTTONS
========================================= */

var stateButtons =
    document.querySelectorAll(
        ".state-pills button"
    );


stateButtons.forEach(
    function(button) {

        button.onclick =
            function() {

                var stateName =
                    button.textContent.trim();


                showSimpleModal(
                    stateName,
                    "State-specific government services and information will be prioritised here."
                );

            };

    }
);


/* =========================================
   OUTLINE / SECONDARY BUTTONS
========================================= */

var outlineButtons =
    document.querySelectorAll(
        ".outline"
    );


outlineButtons.forEach(
    function(button) {

        button.onclick =
            function() {

                var categories =
                    document.getElementById(
                        "categories"
                    );


                if (categories) {

                    categories.scrollIntoView({
                        behavior: "smooth"
                    });

                }

            };

    }
);


/* =========================================
   LOAD SERVICES
========================================= */

loadServices();


/* =========================================
   RESTORE LOGIN SESSION
========================================= */

function restoreLoginSession() {

    var token =
        localStorage.getItem(
            "eazyGovtToken"
        );


    if (!token) {
        return;
    }


    fetch(
        "http://localhost:5000/api/auth/me",
        {
            method: "GET",

            headers: {
                "Authorization":
                    "Bearer " + token
            }
        }
    )

    .then(function(response) {

        if (!response.ok) {

            throw new Error(
                "Session expired"
            );

        }


        return response.json();

    })

    .then(function(data) {

        if (
            data.success &&
            data.user
        ) {

            localStorage.setItem(
                "eazyGovtUser",
                JSON.stringify(
                    data.user
                )
            );


            updateLoggedInHeader(
                data.user
            );

        } else {

            throw new Error(
                "Invalid session"
            );

        }

    })

    .catch(function(error) {

        console.error(
            "Session verification failed:",
            error
        );


        localStorage.removeItem(
            "eazyGovtToken"
        );


        localStorage.removeItem(
            "eazyGovtUser"
        );


        location.reload();

    });

}


restoreLoginSession();


/* =========================================
   AI BACKEND HELPER
========================================= */

async function askEazyGovtAI(
    message
) {

    try {

        var response =
            await fetch(
                "http://localhost:5000/api/ai/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            message:
                                message
                        })
                }
            );


        var data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "AI request failed"
            );

        }


        return data;

    } catch (error) {

        console.error(
            "AI helper error:",
            error
        );


        return {
            success: false,
            message:
                "The AI assistant is temporarily unavailable."
        };

    }

}