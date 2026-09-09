const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const OpenAI = require("openai");
require("dotenv").config();


/* =====================================================
   OPENAI
===================================================== */

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


/* =====================================================
   APP
===================================================== */

const app = express();

const PORT = 5000;


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());

app.use(express.json());


/* =====================================================
   AUTHENTICATION - SIGN UP
===================================================== */

app.post("/api/auth/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        if (
            !name ||
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, email and password are required."
            });

        }


        if (name.trim().length < 2) {

            return res.status(400).json({
                success: false,
                message:
                    "Name must be at least 2 characters."
            });

        }


        if (password.length < 8) {

            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters."
            });

        }


        const cleanEmail =
            email
                .toLowerCase()
                .trim();


        const existingUser =
            await pool.query(
                "SELECT user_id FROM users WHERE email = $1",
                [cleanEmail]
            );


        if (
            existingUser.rows.length > 0
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });

        }


        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        const result =
            await pool.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password_hash
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                RETURNING
                    user_id,
                    name,
                    email,
                    created_at
                `,
                [
                    name.trim(),
                    cleanEmail,
                    passwordHash
                ]
            );


        res.status(201).json({
            success: true,
            message:
                "Account created successfully.",
            user:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "Signup error:",
            error.message
        );


        res.status(500).json({
            success: false,
            message:
                "Unable to create account."
        });

    }

});


/* =====================================================
   AUTHENTICATION - LOGIN
===================================================== */

app.post("/api/auth/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required."
            });

        }


        const cleanEmail =
            email
                .toLowerCase()
                .trim();


        const result =
            await pool.query(
                `
                SELECT
                    user_id,
                    name,
                    email,
                    password_hash,
                    is_active
                FROM users
                WHERE email = $1
                `,
                [cleanEmail]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });

        }


        const user =
            result.rows[0];


        if (!user.is_active) {

            return res.status(403).json({
                success: false,
                message:
                    "This account is inactive."
            });

        }


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });

        }


        const jwtSecret =
            process.env.JWT_SECRET;


        if (!jwtSecret) {

            console.error(
                "JWT_SECRET is missing from .env"
            );


            return res.status(500).json({
                success: false,
                message:
                    "Authentication configuration is incomplete."
            });

        }


        const token =
            jwt.sign(
                {
                    user_id:
                        user.user_id,

                    email:
                        user.email
                },

                jwtSecret,

                {
                    expiresIn:
                        "7d"
                }
            );


        res.json({
            success: true,
            message:
                "Login successful.",
            token:
                token,
            user: {
                user_id:
                    user.user_id,

                name:
                    user.name,

                email:
                    user.email
            }
        });


    } catch (error) {

        console.error(
            "Login error:",
            error.message
        );


        res.status(500).json({
            success: false,
            message:
                "Unable to log in."
        });

    }

});


/* =====================================================
   VERIFY CURRENT LOGIN SESSION
===================================================== */

app.get("/api/auth/me", async (req, res) => {

    try {

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Authentication token is required."
            });

        }


        const token =
            authHeader.split(" ")[1];


        const jwtSecret =
            process.env.JWT_SECRET;


        if (!jwtSecret) {

            return res.status(500).json({
                success: false,
                message:
                    "Authentication configuration is incomplete."
            });

        }


        const decoded =
            jwt.verify(
                token,
                jwtSecret
            );


        const result =
            await pool.query(
                `
                SELECT
                    user_id,
                    name,
                    email,
                    is_active
                FROM users
                WHERE user_id = $1
                `,
                [
                    decoded.user_id
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "User account not found."
            });

        }


        const user =
            result.rows[0];


        if (!user.is_active) {

            return res.status(403).json({
                success: false,
                message:
                    "This account is inactive."
            });

        }


        res.json({
            success: true,
            user: {
                user_id:
                    user.user_id,

                name:
                    user.name,

                email:
                    user.email
            }
        });


    } catch (error) {

        console.error(
            "Session verification error:",
            error.message
        );


        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired authentication token."
        });

    }

});


/* =====================================================
   NORMALIZE USER MESSAGE
===================================================== */

function normalizeText(text) {

    return String(text || "")
        .toLowerCase()
        .replace(
            /[^a-z0-9\u0900-\u097f\s]/gi,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


/* =====================================================
   SERVICE ALIASES
===================================================== */

const SERVICE_ALIASES = {

    "driving licence": [
        "driving licence",
        "driving license",
        "dl",
        "learner licence",
        "learner license",
        "learning licence",
        "learning license",
        "permanent licence",
        "permanent license",
        "driver licence",
        "driver license"
    ],

    "passport": [
        "passport",
        "passport seva"
    ],

    "pan card": [
        "pan",
        "pan card",
        "permanent account number"
    ],

    "aadhaar services": [
        "aadhaar",
        "aadhar",
        "aadhaar card",
        "aadhar card",
        "uidai"
    ],

    "voter id registration": [
        "voter id",
        "voter card",
        "voter",
        "epic",
        "election card"
    ],

    "udyam registration": [
        "udyam",
        "udyam registration",
        "msme",
        "msme registration"
    ],

    "income tax services": [
        "income tax",
        "itr",
        "income tax return",
        "tax return",
        "e filing",
        "efiling",
        "income tax e filing"
    ],

    "education services": [
        "education",
        "education services",
        "scholarship",
        "student services"
    ]

};


/* =====================================================
   LOAD ACTIVE SERVICES
===================================================== */

async function getActiveServices() {

    const result =
        await pool.query(
            `
            SELECT
                s.service_id,
                s.service_name,
                s.description,
                c.name AS category,
                d.name AS department,
                s.scope,
                s.status,
                s.processing_time,
                s.fees,
                s.application_process,
                s.important_notes

            FROM services s

            JOIN categories c
                ON s.category_id =
                   c.category_id

            LEFT JOIN departments d
                ON s.department_id =
                   d.department_id

            WHERE s.status = 'Active'

            ORDER BY s.service_id;
            `
        );


    return result.rows;

}


/* =====================================================
   FIND RELEVANT SERVICES
===================================================== */

async function findRelevantServices(
    userMessage
) {

    const services =
        await getActiveServices();


    if (
        services.length === 0
    ) {

        return [];

    }


    const message =
        normalizeText(
            userMessage
        );


    const stopWords = new Set([

        "how",
        "do",
        "i",
        "the",
        "a",
        "an",
        "for",
        "to",
        "is",
        "are",
        "can",
        "could",
        "please",
        "want",
        "need",
        "help",
        "with",
        "my",
        "me",
        "what",
        "which",
        "where",
        "when",
        "tell",
        "about",
        "apply",
        "application",
        "get",
        "getting",
        "make",
        "new",
        "online",
        "government",
        "service",
        "hai",
        "hain",
        "mujhe",
        "mera",
        "meri",
        "mere",
        "ko",
        "ke",
        "ki",
        "ka",
        "kya",
        "chahiye",
        "batao",
        "bata",
        "karna",
        "karni",
        "kar",
        "kaise",
        "kahan",
        "liye",
        "wala",
        "wali",
        "wale"

    ]);


    const words =
        message
            .split(" ")
            .filter(
                word =>
                    word.length >= 2 &&
                    !stopWords.has(word)
            );


    const scored =
        services.map(
            service => {

                const serviceName =
                    normalizeText(
                        service.service_name
                    );


                const searchableText =
                    normalizeText(
                        [
                            service.service_name,
                            service.description,
                            service.category,
                            service.department
                        ]
                            .filter(Boolean)
                            .join(" ")
                    );


                let score = 0;


                /* Exact service name */

                if (
                    message.includes(
                        serviceName
                    )
                ) {

                    score += 200;

                }


                /* Individual words */

                words.forEach(
                    word => {

                        if (
                            serviceName.includes(
                                word
                            )
                        ) {

                            score += 40;

                        }


                        if (
                            searchableText.includes(
                                word
                            )
                        ) {

                            score += 10;

                        }

                    }
                );


                /* Aliases */

                Object.entries(
                    SERVICE_ALIASES
                ).forEach(
                    ([key, aliases]) => {

                        if (
                            serviceName.includes(
                                key
                            )
                        ) {

                            aliases.forEach(
                                alias => {

                                    if (
                                        message.includes(
                                            normalizeText(alias)
                                        )
                                    ) {

                                        score += 150;

                                    }

                                }
                            );

                        }

                    }
                );


                return {
                    service,
                    score
                };

            }
        );


    return scored
        .filter(
            item =>
                item.score > 0
        )
        .sort(
            (a, b) =>
                b.score -
                a.score
        )
        .slice(
            0,
            3
        )
        .map(
            item =>
                item.service
        );

}


/* =====================================================
   GET COMPLETE SERVICE KNOWLEDGE
===================================================== */

async function getServiceKnowledge(
    serviceId
) {

    const serviceResult =
        await pool.query(
            `
            SELECT
                s.service_id,
                s.service_name,
                s.description,
                c.name AS category,
                d.name AS department,
                s.scope,
                s.status,
                s.processing_time,
                s.fees,
                s.application_process,
                s.important_notes

            FROM services s

            JOIN categories c
                ON s.category_id =
                   c.category_id

            LEFT JOIN departments d
                ON s.department_id =
                   d.department_id

            WHERE s.service_id = $1
              AND s.status = 'Active';
            `,
            [
                serviceId
            ]
        );


    if (
        serviceResult.rows.length === 0
    ) {

        return null;

    }


    const service =
        serviceResult.rows[0];


    const documentsResult =
        await pool.query(
            `
            SELECT
                d.document_id,
                d.name,
                d.description,
                sd.requirement_type,
                sd.notes

            FROM service_documents sd

            JOIN documents d
                ON sd.document_id =
                   d.document_id

            WHERE sd.service_id = $1
              AND d.is_active = TRUE

            ORDER BY d.name;
            `,
            [
                serviceId
            ]
        );


    const eligibilityResult =
        await pool.query(
            `
            SELECT
                eligibility_id,
                condition_type,
                condition_text,
                is_mandatory

            FROM eligibility

            WHERE service_id = $1

            ORDER BY eligibility_id;
            `,
            [
                serviceId
            ]
        );


    const portalsResult =
        await pool.query(
            `
            SELECT
                op.portal_id,
                op.name,
                op.url,
                op.domain,
                op.portal_type,
                sp.is_primary

            FROM service_portals sp

            JOIN official_portals op
                ON sp.portal_id =
                   op.portal_id

            WHERE sp.service_id = $1
              AND op.is_active = TRUE

            ORDER BY
                sp.is_primary DESC,
                op.name;
            `,
            [
                serviceId
            ]
        );


    return {

        ...service,

        documents:
            documentsResult.rows,

        eligibility:
            eligibilityResult.rows,

        official_portals:
            portalsResult.rows

    };

}


/* =====================================================
   V2 - DETECT STATE
===================================================== */

async function detectState(
    userMessage
) {

    const text =
        normalizeText(
            userMessage
        );


    const stateResult =
        await pool.query(
            `
            SELECT
                state_id,
                name,
                code,
                state_type
            FROM states
            WHERE is_active = TRUE
            ORDER BY name;
            `
        );


    const states =
        stateResult.rows;


    if (
        states.length === 0
    ) {

        return null;

    }


    /*
       Match complete state names first.
    */

    const exactMatches =
        states
            .filter(
                state =>
                    text.includes(
                        normalizeText(
                            state.name
                        )
                    )
            )
            .sort(
                (a, b) =>
                    normalizeText(b.name).length -
                    normalizeText(a.name).length
            );


    if (
        exactMatches.length > 0
    ) {

        return exactMatches[0];

    }


    /*
       Common conversational aliases.
    */

    const aliases = {

        "dilli": "DL",
        "new delhi": "DL",
        "delhi": "DL",

        "up": "UP",
        "uttar pradesh": "UP",

        "mp": "MP",
        "madhya pradesh": "MP",

        "hp": "HP",
        "himachal": "HP",

        "jk": "JK",
        "jammu kashmir": "JK",

        "uk": "UK",
        "uttarakhand": "UK",

        "wb": "WB",
        "west bengal": "WB",

        "tn": "TN",
        "tamil nadu": "TN",

        "ap": "AP",
        "andhra": "AP",

        "ka": "KA",
        "karnataka": "KA",

        "kl": "KL",
        "kerala": "KL",

        "mh": "MH",
        "maharashtra": "MH",

        "gj": "GJ",
        "gujarat": "GJ",

        "rj": "RJ",
        "rajasthan": "RJ",

        "hr": "HR",
        "haryana": "HR",

        "pb": "PB",
        "punjab": "PB",

        "br": "BR",
        "bihar": "BR",

        "jh": "JH",
        "jharkhand": "JH",

        "od": "OD",
        "odisha": "OD",
        "orissa": "OD",

        "ts": "TS",
        "telangana": "TS",

        "ga": "GA",
        "goa": "GA",

        "ch": "CH",
        "chandigarh": "CH",

        "py": "PY",
        "puducherry": "PY",
        "pondicherry": "PY",

        "la": "LA",
        "ladakh": "LA",

        "ld": "LD",
        "lakshadweep": "LD",

        "an": "AN",
        "andaman nicobar": "AN",

        "ar": "AR",
        "arunachal": "AR",

        "as": "AS",
        "assam": "AS",

        "mn": "MN",
        "manipur": "MN",

        "ml": "ML",
        "meghalaya": "ML",

        "mz": "MZ",
        "mizoram": "MZ",

        "nl": "NL",
        "nagaland": "NL",

        "sk": "SK",
        "sikkim": "SK",

        "tr": "TR",
        "tripura": "TR",

        "ut": "UK",
        "uttarakhand": "UK",

        "dn": "DNDD",
        "dd": "DNDD",
        "daman": "DNDD",
        "diu": "DNDD"

    };


    for (
        const [alias, code]
        of Object.entries(aliases)
    ) {

        if (
            text.includes(
                ` ${alias} `
            ) ||
            text === alias ||
            text.startsWith(
                `${alias} `
            ) ||
            text.endsWith(
                ` ${alias}`
            )
        ) {

            const state =
                states.find(
                    item =>
                        item.code === code
                );


            if (state) {

                return state;

            }

        }

    }


    return null;

}


/* =====================================================
   V2 - DETECT SERVICE VARIANT
===================================================== */

async function detectServiceVariant(
    serviceId,
    userMessage
) {

    const result =
        await pool.query(
            `
            SELECT
                variant_id,
                service_id,
                variant_name,
                slug,
                description
            FROM service_variants
            WHERE service_id = $1
              AND is_active = TRUE
            ORDER BY variant_id;
            `,
            [
                serviceId
            ]
        );


    const variants =
        result.rows;


    if (
        variants.length === 0
    ) {

        return null;

    }


    const text =
        normalizeText(
            userMessage
        );


    /*
       First: exact variant-name match.
    */

    const exactMatches =
        variants
            .filter(
                variant =>
                    text.includes(
                        normalizeText(
                            variant.variant_name
                        )
                    )
            )
            .sort(
                (a, b) =>
                    normalizeText(
                        b.variant_name
                    ).length -
                    normalizeText(
                        a.variant_name
                    ).length
            );


    if (
        exactMatches.length > 0
    ) {

        return exactMatches[0];

    }


    /*
       Variant aliases.

       We deliberately do not treat generic words such
       as "licence" or "passport" as a variant because
       that would cause incorrect matches.
    */

    const variantAliases = {

        "learner licence": [
            "learner licence",
            "learner license",
            "learning licence",
            "learning license",
            "learner",
            "ll"
        ],

        "new permanent driving licence": [
            "new permanent driving licence",
            "new permanent driving license",
            "permanent driving licence",
            "permanent driving license",
            "new driving licence",
            "new driving license"
        ],

        "driving licence renewal": [
            "driving licence renewal",
            "driving license renewal",
            "dl renewal",
            "licence renewal",
            "license renewal",
            "renew driving licence",
            "renew driving license"
        ],

        "duplicate driving licence": [
            "duplicate driving licence",
            "duplicate driving license",
            "duplicate dl",
            "lost driving licence",
            "lost driving license"
        ],

        "change of address": [
            "change of address",
            "address change",
            "change address"
        ],

        "international driving permit": [
            "international driving permit",
            "international driving licence",
            "international driving license",
            "idp"
        ],

        "fresh passport": [
            "fresh passport",
            "new passport"
        ],

        "passport renewal": [
            "passport renewal",
            "renew passport",
            "passport renew"
        ],

        "tatkal passport": [
            "tatkal passport",
            "tatkal"
        ],

        "minor passport": [
            "minor passport",
            "passport for minor",
            "child passport"
        ],

        "lost or damaged passport": [
            "lost passport",
            "damaged passport",
            "lost or damaged passport"
        ],

        "new pan application": [
            "new pan",
            "new pan card",
            "pan application",
            "pan card application"
        ],

        "pan correction": [
            "pan correction",
            "correct pan",
            "pan card correction"
        ],

        "pan reprint": [
            "pan reprint",
            "reprint pan"
        ],

        "aadhaar enrolment": [
            "aadhaar enrolment",
            "aadhaar enrollment",
            "new aadhaar",
            "aadhaar registration"
        ],

        "aadhaar update": [
            "aadhaar update",
            "update aadhaar",
            "aadhar update"
        ],

        "aadhaar download": [
            "aadhaar download",
            "download aadhaar",
            "download aadhar"
        ],

        "aadhaar pvc card": [
            "aadhaar pvc",
            "aadhaar pvc card",
            "pvc aadhaar"
        ],

        "new voter registration": [
            "new voter",
            "new voter registration",
            "voter registration"
        ],

        "voter details correction": [
            "voter correction",
            "voter details correction",
            "correct voter id"
        ],

        "address change": [
            "voter address change",
            "address change voter"
        ],

        "replacement voter card": [
            "replacement voter card",
            "duplicate voter card"
        ],

        "new udyam registration": [
            "new udyam",
            "udyam registration",
            "udyam apply"
        ],

        "udyam registration update": [
            "udyam update",
            "update udyam"
        ],

        "udyam certificate access": [
            "udyam certificate",
            "download udyam certificate"
        ],

        "itr filing": [
            "itr filing",
            "income tax return filing",
            "file itr",
            "file income tax return"
        ],

        "refund": [
            "income tax refund",
            "itr refund",
            "tax refund"
        ],

        "notice": [
            "income tax notice",
            "tax notice",
            "itr notice"
        ],

        "pan related income tax service": [
            "pan income tax",
            "pan related income tax"
        ],

        "scholarship": [
            "scholarship",
            "education scholarship"
        ],

        "admission": [
            "education admission",
            "college admission",
            "school admission"
        ],

        "education certificate": [
            "education certificate",
            "educational certificate"
        ],

        "student scheme": [
            "student scheme",
            "student schemes"
        ]

    };


    for (
        const variant
        of variants
    ) {

        const normalizedName =
            normalizeText(
                variant.variant_name
            );


        const aliases =
            variantAliases[
                normalizedName
            ] || [];


        for (
            const alias
            of aliases
        ) {

            const normalizedAlias =
                normalizeText(alias);


            if (
                text.includes(
                    normalizedAlias
                )
            ) {

                return variant;

            }

        }

    }


    /*
       Secondary matching based on distinctive words.
    */

    const ignoredVariantWords =
        new Set([
            "driving",
            "licence",
            "license",
            "new",
            "service",
            "card",
            "registration",
            "application"
        ]);


    let bestVariant = null;
    let bestScore = 0;


    for (
        const variant
        of variants
    ) {

        const words =
            normalizeText(
                variant.variant_name
            )
                .split(" ")
                .filter(
                    word =>
                        word.length >= 3 &&
                        !ignoredVariantWords.has(word)
                );


        let score = 0;


        words.forEach(
            word => {

                if (
                    text.includes(word)
                ) {

                    score += 30;

                }

            }
        );


        if (
            score > bestScore
        ) {

            bestScore = score;
            bestVariant = variant;

        }

    }


    if (
        bestScore >= 30
    ) {

        return bestVariant;

    }


    return null;

}


/* =====================================================
   V2 - GET VARIANT + STATE KNOWLEDGE
===================================================== */

async function getV2Knowledge(
    serviceId,
    variantId,
    stateId
) {

    const variantResult =
        await pool.query(
            `
            SELECT
                sv.variant_id,
                sv.variant_name,
                sv.description,

                s.service_id,
                s.service_name,

                st.state_id,
                st.name AS state_name,
                st.code AS state_code,
                st.state_type

            FROM service_variants sv

            JOIN services s
                ON sv.service_id =
                   s.service_id

            JOIN states st
                ON st.state_id = $3

            WHERE sv.service_id = $1
              AND sv.variant_id = $2
              AND sv.is_active = TRUE
              AND s.status = 'Active'
              AND st.is_active = TRUE;
            `,
            [
                serviceId,
                variantId,
                stateId
            ]
        );


    if (
        variantResult.rows.length === 0
    ) {

        return null;

    }


    const base =
        variantResult.rows[0];


    const factsResult =
        await pool.query(
            `
            SELECT
                k.fact_id,
                k.fact_type,
                k.fact_title,
                k.fact_content,
                k.source_id,
                k.verification_status,
                k.verified_at,

                src.source_name,
                src.url AS source_url

            FROM knowledge_facts k

            LEFT JOIN sources src
                ON k.source_id =
                   src.source_id

            WHERE k.service_id = $1
              AND k.variant_id = $2
              AND k.state_id = $3
              AND k.is_active = TRUE
              AND k.verification_status = 'VERIFIED'

            ORDER BY
                k.fact_type,
                k.fact_id;
            `,
            [
                serviceId,
                variantId,
                stateId
            ]
        );


    const feesResult =
        await pool.query(
            `
            SELECT
                f.fee_id,
                f.fee_type,
                f.amount,
                f.currency,
                f.condition_text,
                f.notes,
                f.fact_id

            FROM fees f

            WHERE f.variant_id = $1
              AND f.state_id = $2
              AND f.is_active = TRUE

            ORDER BY f.fee_id;
            `,
            [
                variantId,
                stateId
            ]
        );


    const processResult =
        await pool.query(
            `
            SELECT
                ps.process_step_id,
                ps.step_number,
                ps.title,
                ps.description,
                ps.action_url,
                ps.condition_text,
                ps.notes,
                ps.fact_id

            FROM process_steps ps

            WHERE ps.variant_id = $1
              AND ps.state_id = $2
              AND ps.is_active = TRUE

            ORDER BY ps.step_number;
            `,
            [
                variantId,
                stateId
            ]
        );


    const processingTimeResult =
        await pool.query(
            `
            SELECT
                pt.processing_time_id,
                pt.time_value,
                pt.time_unit,
                pt.time_text,
                pt.condition_text,
                pt.notes,
                pt.fact_id

            FROM processing_times pt

            WHERE pt.variant_id = $1
              AND pt.state_id = $2
              AND pt.is_active = TRUE

            ORDER BY pt.processing_time_id;
            `,
            [
                variantId,
                stateId
            ]
        );


    const requirementsResult =
        await pool.query(
            `
            SELECT
                r.requirement_id,
                r.requirement_type,
                r.title,
                r.description,
                r.condition_text,
                r.notes,
                r.is_mandatory,
                r.fact_id

            FROM requirements r

            WHERE r.variant_id = $1
              AND r.state_id = $2
              AND r.is_active = TRUE

            ORDER BY r.requirement_id;
            `,
            [
                variantId,
                stateId
            ]
        );


    const portalsResult =
        await pool.query(
            `
            SELECT
                vp.variant_portal_id,
                vp.is_primary,
                vp.purpose,
                vp.notes,
                vp.fact_id,

                op.portal_id,
                op.name,
                op.url,
                op.domain,
                op.portal_type

            FROM variant_portals vp

            JOIN official_portals op
                ON vp.portal_id =
                   op.portal_id

            WHERE vp.variant_id = $1
              AND vp.state_id = $2
              AND vp.is_active = TRUE
              AND op.is_active = TRUE

            ORDER BY
                vp.is_primary DESC,
                op.name;
            `,
            [
                variantId,
                stateId
            ]
        );


    return {

        ...base,

        facts:
            factsResult.rows,

        fees:
            feesResult.rows,

        process_steps:
            processResult.rows,

        processing_times:
            processingTimeResult.rows,

        requirements:
            requirementsResult.rows,

        official_portals:
            portalsResult.rows

    };

}


/* =====================================================
   DETECT USER QUESTION TYPE
===================================================== */

function detectQuestionType(
    message
) {

    const text =
        normalizeText(
            message
        );


    const documentWords = [
        "document",
        "documents",
        "doc",
        "docs",
        "paper",
        "papers",
        "proof",
        "papers kya",
        "documents kya",
        "kya chahiye"
    ];


    const eligibilityWords = [
        "eligible",
        "eligibility",
        "qualify",
        "qualification",
        "patrata",
        "eligible hoon",
        "eligible hu"
    ];


    const feeWords = [
        "fee",
        "fees",
        "cost",
        "price",
        "charge",
        "charges",
        "kitna paisa",
        "kitne paise"
    ];


    const timeWords = [
        "how long",
        "processing time",
        "time",
        "kitna time",
        "kab tak",
        "days",
        "din"
    ];


    const processWords = [
        "process",
        "procedure",
        "steps",
        "apply",
        "application",
        "kaise apply",
        "kaise karu",
        "kaise karna"
    ];


    const portalWords = [
        "official website",
        "official portal",
        "website",
        "portal",
        "link",
        "kahan apply",
        "apply kaha"
    ];


    function containsAny(words) {

        return words.some(
            word =>
                text.includes(
                    normalizeText(word)
                )
        );

    }


    if (
        containsAny(documentWords)
    ) {

        return "documents";

    }


    if (
        containsAny(eligibilityWords)
    ) {

        return "eligibility";

    }


    if (
        containsAny(feeWords)
    ) {

        return "fees";

    }


    if (
        containsAny(timeWords)
    ) {

        return "processing_time";

    }


    if (
        containsAny(portalWords)
    ) {

        return "portal";

    }


    if (
        containsAny(processWords)
    ) {

        return "application_process";

    }


    return "general";

}


/* =====================================================
   V2 - FORMAT DOCUMENT ANSWER
===================================================== */

function buildV2DocumentAnswer(
    knowledge
) {

    const facts =
        knowledge.facts
            .filter(
                fact =>
                    fact.fact_type ===
                    "DOCUMENT"
            );


    if (
        facts.length === 0
    ) {

        return null;

    }


    const lines =
        facts.map(
            fact =>
                `• ${fact.fact_title} — ${fact.fact_content}`
        );


    return {

        success: true,

        reply:
            `**${knowledge.variant_name} — Required Documents (${knowledge.state_name})**\n\n${lines.join("\n")}`,

        matched_services: [
            {
                service_id:
                    knowledge.service_id,

                service_name:
                    knowledge.service_name,

                variant_id:
                    knowledge.variant_id,

                variant_name:
                    knowledge.variant_name,

                state_id:
                    knowledge.state_id,

                state_name:
                    knowledge.state_name,

                state_code:
                    knowledge.state_code
            }
        ]

    };

}


/* =====================================================
   V2 - FORMAT ELIGIBILITY ANSWER
===================================================== */

function buildV2EligibilityAnswer(
    knowledge
) {

    const facts =
        knowledge.facts
            .filter(
                fact =>
                    fact.fact_type ===
                    "ELIGIBILITY"
            );


    if (
        facts.length === 0
    ) {

        return null;

    }


    const lines =
        facts.map(
            fact =>
                `• ${fact.fact_title} — ${fact.fact_content}`
        );


    return {

        success: true,

        reply:
            `**${knowledge.variant_name} — Eligibility (${knowledge.state_name})**\n\n${lines.join("\n")}`,

        matched_services: [
            {
                service_id:
                    knowledge.service_id,

                service_name:
                    knowledge.service_name,

                variant_id:
                    knowledge.variant_id,

                variant_name:
                    knowledge.variant_name,

                state_id:
                    knowledge.state_id,

                state_name:
                    knowledge.state_name,

                state_code:
                    knowledge.state_code
            }
        ]

    };

}


/* =====================================================
   V2 - FORMAT FEE ANSWER
===================================================== */

function buildV2FeeAnswer(
    knowledge
) {

    if (
        knowledge.fees.length === 0
    ) {

        return null;

    }


    const lines =
        knowledge.fees.map(
            fee => {

                let amount =
                    fee.amount;


                if (
                    amount !== null &&
                    amount !== undefined
                ) {

                    amount =
                        `${fee.currency || "₹"}${amount}`;

                } else {

                    amount =
                        fee.notes ||
                        "Fee amount not specified";

                }


                let line =
                    `• ${fee.fee_type}: ${amount}`;


                if (
                    fee.condition_text
                ) {

                    line +=
                        ` — ${fee.condition_text}`;

                }


                return line;

            }
        );


    return {

        success: true,

        reply:
            `**${knowledge.variant_name} — Fee (${knowledge.state_name})**\n\n${lines.join("\n")}`,

        matched_services: [
            {
                service_id:
                    knowledge.service_id,

                service_name:
                    knowledge.service_name,

                variant_id:
                    knowledge.variant_id,

                variant_name:
                    knowledge.variant_name,

                state_id:
                    knowledge.state_id,

                state_name:
                    knowledge.state_name,

                state_code:
                    knowledge.state_code
            }
        ]

    };

}


/* =====================================================
   V2 - FORMAT PROCESSING TIME ANSWER
===================================================== */

function buildV2ProcessingTimeAnswer(
    knowledge
) {

    if (
        knowledge.processing_times.length === 0
    ) {

        return null;

    }


    const lines =
        knowledge.processing_times.map(
            item => {

                let line =
                    `• ${item.time_text || `${item.time_value} ${item.time_unit}`}`;


                if (
                    item.condition_text
                ) {

                    line +=
                        ` — ${item.condition_text}`;

                }


                if (
                    item.notes
                ) {

                    line +=
                        ` (${item.notes})`;

                }


                return line;

            }
        );


    return {

        success: true,

        reply:
            `**${knowledge.variant_name} — Processing Time (${knowledge.state_name})**\n\n${lines.join("\n")}`,

        matched_services: [
            {
                service_id:
                    knowledge.service_id,

                service_name:
                    knowledge.service_name,

                variant_id:
                    knowledge.variant_id,

                variant_name:
                    knowledge.variant_name,

                state_id:
                    knowledge.state_id,

                state_name:
                    knowledge.state_name,

                state_code:
                    knowledge.state_code
            }
        ]

    };

}


/* =====================================================
   V2 - FORMAT PROCESS ANSWER
===================================================== */

function buildV2ProcessAnswer(
    knowledge
) {

    if (
        knowledge.process_steps.length === 0
    ) {

        return null;

    }


    const lines =
        knowledge.process_steps.map(
            step => {

                let line =
                    `${step.step_number}. **${step.title}**`;


                if (
                    step.description
                ) {

                    line +=
                        ` — ${step.description}`;

                }


                if (
                    step.condition_text
                ) {

                    line +=
                        ` — ${step.condition_text}`;

                }


                return line;

            }
        );


    let reply =
        `**${knowledge.variant_name} — Application Process (${knowledge.state_name})**\n\n${lines.join("\n")}`;


    const primaryPortal =
        knowledge.official_portals.find(
            portal =>
                portal.is_primary
        ) ||
        knowledge.official_portals[0];


    if (
        primaryPortal
    ) {

        reply +=
            `\n\n**Official portal:**\n${primaryPortal.name}\n${primaryPortal.url}`;

    }


    return {

        success: true,

        reply,

        matched_services: [
            {
                service_id:
                    knowledge.service_id,

                service_name:
                    knowledge.service_name,

                variant_id:
                    knowledge.variant_id,

                variant_name:
                    knowledge.variant_name,

                state_id:
                    knowledge.state_id,

                state_name:
                    knowledge.state_name,

                state_code:
                    knowledge.state_code
            }
        ]

    };

}


/* =====================================================
   V2 - FORMAT PORTAL ANSWER
===================================================== */

function buildV2PortalAnswer(
    knowledge
) {

    if (
        knowledge.official_portals.length === 0
    ) {

        return null;

    }


    const lines =
        knowledge.official_portals.map(
            portal => {

                let line =
                    `• ${portal.name}\n  ${portal.url}`;


                if (
                    portal.purpose
                ) {

                    line +=
                        `\n  Purpose: ${portal.purpose}`;

                }


                return line;

            }
        );


    return {

        success: true,

        reply:
            `**${knowledge.variant_name} — Official Portal (${knowledge.state_name})**\n\n${lines.join("\n\n")}`,

        matched_services: [
            {
                service_id:
                    knowledge.service_id,

                service_name:
                    knowledge.service_name,

                variant_id:
                    knowledge.variant_id,

                variant_name:
                    knowledge.variant_name,

                state_id:
                    knowledge.state_id,

                state_name:
                    knowledge.state_name,

                state_code:
                    knowledge.state_code
            }
        ]

    };

}


/* =====================================================
   V2 - BUILD AI CONTEXT
===================================================== */

function buildV2AIContext(
    knowledge
) {

    return JSON.stringify({

        service:
            knowledge.service_name,

        variant:
            knowledge.variant_name,

        state:
            knowledge.state_name,

        state_code:
            knowledge.state_code,

        facts:
            knowledge.facts,

        fees:
            knowledge.fees,

        process_steps:
            knowledge.process_steps,

        processing_times:
            knowledge.processing_times,

        requirements:
            knowledge.requirements,

        official_portals:
            knowledge.official_portals

    }, null, 2);

}


/* =====================================================
   V2 - GENERAL AI RESPONSE
===================================================== */

async function generateV2AIAnswer(
    message,
    knowledge
) {

    const databaseContext =
        buildV2AIContext(
            knowledge
        );


    const instructions = `

You are EazyGovt AI.

EazyGovt is an independent citizen-guidance
platform for Indian government services.

It is NOT a government website and is NOT
affiliated with the Government of India.

The DATABASE DATA below is the source of truth.

You may ONLY use information contained in the
DATABASE DATA.

Never invent or assume:

- eligibility
- documents
- fees
- processing times
- deadlines
- application steps
- government rules
- office information
- portal URLs

If the requested information is not present
in the database, clearly say:

"That information is not currently available
in EazyGovt's database."

Do not replace missing information with general
knowledge.

The answer applies specifically to:

Service:
${knowledge.service_name}

Variant:
${knowledge.variant_name}

State/UT:
${knowledge.state_name}

If the database contains a NOTE describing a
source discrepancy, do not silently choose one
source. Explain the discrepancy briefly.

Only provide URLs exactly as they appear in the
database.

EazyGovt does not submit applications.

RESPONSE STYLE:

- Be specific.
- Be concise.
- Use bullets when useful.
- Match English, Hindi or Hinglish used by the user.
- Do not repeat the user's question.
- Do not provide unrelated information.
- Do not make assumptions.
- If something is unavailable, say so.

DATABASE DATA:

${databaseContext}

END DATABASE DATA.
`;


    const response =
        await openai.responses.create({

            model:
                "gpt-5.6-luna",

            instructions:
                instructions,

            input:
                message

        });


    return response.output_text;

}


/* =====================================================
   V1 FORMATTERS
===================================================== */

function buildDocumentAnswer(
    service
) {

    const documents =
        service.documents || [];


    if (
        documents.length === 0
    ) {

        return {

            success: true,

            reply:
                `${service.service_name} ke liye documents ki information abhi EazyGovt database mein available nahi hai.`,

            matched_services: [
                {
                    service_id:
                        service.service_id,

                    service_name:
                        service.service_name
                }
            ]

        };

    }


    const lines =
        documents.map(
            document => {

                let line =
                    `• ${document.name}`;


                if (
                    document.notes
                ) {

                    line +=
                        ` — ${document.notes}`;

                }


                return line;

            }
        );


    return {

        success: true,

        reply:
            `${service.service_name} ke liye EazyGovt ke records mein:\n\n${lines.join("\n")}`,

        matched_services: [
            {
                service_id:
                    service.service_id,

                service_name:
                    service.service_name
            }
        ]

    };

}


function buildEligibilityAnswer(
    service
) {

    const eligibility =
        service.eligibility || [];


    if (
        eligibility.length === 0
    ) {

        return {

            success: true,

            reply:
                `${service.service_name} ki eligibility information abhi EazyGovt database mein available nahi hai.`,

            matched_services: [
                {
                    service_id:
                        service.service_id,

                    service_name:
                        service.service_name
                }
            ]

        };

    }


    const lines =
        eligibility.map(
            item =>
                `• ${item.condition_text}`
        );


    return {

        success: true,

        reply:
            `${service.service_name} ke liye EazyGovt ke records mein eligibility:\n\n${lines.join("\n")}`,

        matched_services: [
            {
                service_id:
                    service.service_id,

                service_name:
                    service.service_name
            }
        ]

    };

}


function buildFeeAnswer(
    service
) {

    if (
        service.fees === null ||
        service.fees === undefined ||
        service.fees === ""
    ) {

        return {

            success: true,

            reply:
                `${service.service_name} ki fee information abhi EazyGovt database mein available nahi hai.`,

            matched_services: [
                {
                    service_id:
                        service.service_id,

                    service_name:
                        service.service_name
                }
            ]

        };

    }


    return {

        success: true,

        reply:
            `**${service.service_name}**\n\nFee: ${service.fees}`,

        matched_services: [
            {
                service_id:
                    service.service_id,

                service_name:
                    service.service_name
            }
        ]

    };

}


function buildProcessingTimeAnswer(
    service
) {

    if (
        service.processing_time === null ||
        service.processing_time === undefined ||
        service.processing_time === ""
    ) {

        return {

            success: true,

            reply:
                `${service.service_name} ka processing time abhi EazyGovt database mein available nahi hai.`,

            matched_services: [
                {
                    service_id:
                        service.service_id,

                    service_name:
                        service.service_name
                }
            ]

        };

    }


    return {

        success: true,

        reply:
            `**${service.service_name}**\n\nProcessing time: ${service.processing_time}`,

        matched_services: [
            {
                service_id:
                    service.service_id,

                service_name:
                    service.service_name
            }
        ]

    };

}


function buildApplicationAnswer(
    service
) {

    const process =
        service.application_process;


    if (
        !process
    ) {

        return {

            success: true,

            reply:
                `${service.service_name} ka application process abhi EazyGovt database mein available nahi hai.`,

            matched_services: [
                {
                    service_id:
                        service.service_id,

                    service_name:
                        service.service_name
                }
            ]

        };

    }


    let reply =
        `**${service.service_name}**\n\n${process}`;


    if (
        service.official_portals &&
        service.official_portals.length > 0
    ) {

        const portal =
            service.official_portals.find(
                item =>
                    item.is_primary
            ) ||
            service.official_portals[0];


        reply +=
            `\n\nOfficial portal:\n${portal.name}\n${portal.url}`;

    }


    return {

        success: true,

        reply,

        matched_services: [
            {
                service_id:
                    service.service_id,

                service_name:
                    service.service_name
            }
        ]

    };

}


function buildPortalAnswer(
    service
) {

    const portals =
        service.official_portals || [];


    if (
        portals.length === 0
    ) {

        return {

            success: true,

            reply:
                `${service.service_name} ka official portal abhi EazyGovt database mein available nahi hai.`,

            matched_services: [
                {
                    service_id:
                        service.service_id,

                    service_name:
                        service.service_name
                }
            ]

        };

    }


    const lines =
        portals.map(
            portal =>
                `• ${portal.name}\n  ${portal.url}`
        );


    return {

        success: true,

        reply:
            `**${service.service_name}** ke official portal:\n\n${lines.join("\n\n")}`,

        matched_services: [
            {
                service_id:
                    service.service_id,

                service_name:
                    service.service_name
            }
        ]

    };

}


/* =====================================================
   BUILD GENERAL V1 AI CONTEXT
===================================================== */

function buildSafeAIContext(
    service
) {

    return JSON.stringify({

        service_name:
            service.service_name,

        description:
            service.description,

        category:
            service.category,

        department:
            service.department,

        scope:
            service.scope,

        processing_time:
            service.processing_time,

        fees:
            service.fees,

        application_process:
            service.application_process,

        important_notes:
            service.important_notes,

        documents:
            service.documents,

        eligibility:
            service.eligibility,

        official_portals:
            service.official_portals

    }, null, 2);

}


/* =====================================================
   GENERAL V1 AI RESPONSE
===================================================== */

async function generateGeneralAIAnswer(
    message,
    service
) {

    const databaseContext =
        buildSafeAIContext(
            service
        );


    const instructions = `

You are EazyGovt AI.

EazyGovt is an independent citizen-guidance
platform for Indian government services.

It is NOT a government website and is NOT
affiliated with the Government of India.

You are answering about the EazyGovt service
shown in the DATABASE DATA below.

CRITICAL RULE:

You may ONLY use facts contained in DATABASE DATA.

Do NOT add information from your own knowledge.

Do NOT invent:

- documents
- eligibility
- fees
- processing times
- deadlines
- application steps
- portal URLs
- government rules

If the database does not contain information
needed to answer the user's question, say:

"That information is not currently available
in EazyGovt's database."

Do not fill missing information with general
knowledge.

RESPONSE STYLE:

- Be concise.
- Prefer 3-6 short lines or bullets.
- Use simple language.
- Match the user's English/Hindi/Hinglish style.
- Do not repeat the question.
- Do not create long generic lists.
- Ask one short follow-up question only if necessary.

EazyGovt does not submit applications.

When an official portal exists in the database,
you may provide that exact portal.

Never create or modify a portal URL.

DATABASE DATA:

${databaseContext}

END DATABASE DATA.
`;


    const response =
        await openai.responses.create({

            model:
                "gpt-5.6-luna",

            instructions:
                instructions,

            input:
                message

        });


    return response.output_text;

}


/* =====================================================
   EAZY GOVT AI CHAT - V2 DATABASE-FIRST FLOW
===================================================== */

app.post(
    "/api/ai/chat",
    async (req, res) => {

        try {

            const {
                message
            } = req.body;


            if (
                !message ||
                !message.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a message."

                });

            }


            const cleanMessage =
                message.trim();


            /* -----------------------------------------
               STEP 1
               FIND SERVICE
            ----------------------------------------- */

            const relevantServices =
                await findRelevantServices(
                    cleanMessage
                );


            if (
                relevantServices.length === 0
            ) {

                return res.json({

                    success: true,

                    reply:
                        "I couldn't find a matching service in EazyGovt's current service database. Tell me the government service you're looking for and I'll help you find the right one.",

                    matched_services: []

                });

            }


            const service =
                relevantServices[0];


            /* -----------------------------------------
               STEP 2
               DETECT VARIANT
            ----------------------------------------- */

            const variant =
                await detectServiceVariant(
                    service.service_id,
                    cleanMessage
                );


            /*
               If this service has variants and the
               user has not specified one, ask rather
               than guessing.
            */

            if (
                !variant
            ) {

                const variantResult =
                    await pool.query(
                        `
                        SELECT
                            variant_id,
                            variant_name
                        FROM service_variants
                        WHERE service_id = $1
                          AND is_active = TRUE
                        ORDER BY variant_id;
                        `,
                        [
                            service.service_id
                        ]
                    );


                if (
                    variantResult.rows.length > 0
                ) {

                    const variantNames =
                        variantResult.rows
                            .map(
                                item =>
                                    item.variant_name
                            )
                            .join(", ");


                    return res.json({

                        success: true,

                        reply:
                            `I found ${service.service_name}, but I need to know which service type you mean.\n\nAvailable options include: ${variantNames}.\n\nWhich one do you need?`,

                        matched_services: [
                            {
                                service_id:
                                    service.service_id,

                                service_name:
                                    service.service_name
                            }
                        ]

                    });

                }

            }


            /* -----------------------------------------
               STEP 3
               DETECT STATE / UT
            ----------------------------------------- */

            const state =
                await detectState(
                    cleanMessage
                );


            /*
               If the service has V2 variants but the
               user hasn't supplied a state, do not
               guess.
            */

            if (
                !state
            ) {

                return res.json({

                    success: true,

                    reply:
                        `I found ${service.service_name}${variant ? ` → ${variant.variant_name}` : ""}, but I need your State/UT because requirements, fees and procedures can vary by location.\n\nFor example: Delhi, Haryana, Maharashtra, Uttar Pradesh, etc.`,

                    matched_services: [
                        {
                            service_id:
                                service.service_id,

                            service_name:
                                service.service_name,

                            ...(variant
                                ? {
                                    variant_id:
                                        variant.variant_id,

                                    variant_name:
                                        variant.variant_name
                                }
                                : {})
                        }
                    ]

                });

            }


            /* -----------------------------------------
               STEP 4
               V2 KNOWLEDGE
            ----------------------------------------- */

            if (
                variant
            ) {

                const knowledge =
                    await getV2Knowledge(
                        service.service_id,
                        variant.variant_id,
                        state.state_id
                    );


                if (
                    knowledge
                ) {

                    const questionType =
                        detectQuestionType(
                            cleanMessage
                        );


                    /*
                       FACTUAL V2 QUESTIONS
                       are answered directly from
                       verified database records.
                    */

                    if (
                        questionType ===
                        "documents"
                    ) {

                        const answer =
                            buildV2DocumentAnswer(
                                knowledge
                            );


                        if (answer) {

                            return res.json(
                                answer
                            );

                        }

                    }


                    if (
                        questionType ===
                        "eligibility"
                    ) {

                        const answer =
                            buildV2EligibilityAnswer(
                                knowledge
                            );


                        if (answer) {

                            return res.json(
                                answer
                            );

                        }

                    }


                    if (
                        questionType ===
                        "fees"
                    ) {

                        const answer =
                            buildV2FeeAnswer(
                                knowledge
                            );


                        if (answer) {

                            return res.json(
                                answer
                            );

                        }

                    }


                    if (
                        questionType ===
                        "processing_time"
                    ) {

                        const answer =
                            buildV2ProcessingTimeAnswer(
                                knowledge
                            );


                        if (answer) {

                            return res.json(
                                answer
                            );

                        }

                    }


                    if (
                        questionType ===
                        "application_process"
                    ) {

                        const answer =
                            buildV2ProcessAnswer(
                                knowledge
                            );


                        if (answer) {

                            return res.json(
                                answer
                            );

                        }

                    }


                    if (
                        questionType ===
                        "portal"
                    ) {

                        const answer =
                            buildV2PortalAnswer(
                                knowledge
                            );


                        if (answer) {

                            return res.json(
                                answer
                            );

                        }

                    }


                    /*
                       General question:
                       allow AI to explain ONLY
                       the V2 database context.
                    */

                    const reply =
                        await generateV2AIAnswer(
                            cleanMessage,
                            knowledge
                        );


                    return res.json({

                        success: true,

                        reply,

                        matched_services: [
                            {
                                service_id:
                                    knowledge.service_id,

                                service_name:
                                    knowledge.service_name,

                                variant_id:
                                    knowledge.variant_id,

                                variant_name:
                                    knowledge.variant_name,

                                state_id:
                                    knowledge.state_id,

                                state_name:
                                    knowledge.state_name,

                                state_code:
                                    knowledge.state_code
                            }
                        ]

                    });

                }

            }


            /* -----------------------------------------
               V1 FALLBACK
            ----------------------------------------- */

            const legacyService =
                await getServiceKnowledge(
                    service.service_id
                );


            if (
                !legacyService
            ) {

                return res.json({

                    success: true,

                    reply:
                        "I found the service, but its detailed information is not currently available in EazyGovt's database.",

                    matched_services: []

                });

            }


            const questionType =
                detectQuestionType(
                    cleanMessage
                );


            if (
                questionType ===
                "documents"
            ) {

                return res.json(
                    buildDocumentAnswer(
                        legacyService
                    )
                );

            }


            if (
                questionType ===
                "eligibility"
            ) {

                return res.json(
                    buildEligibilityAnswer(
                        legacyService
                    )
                );

            }


            if (
                questionType ===
                "fees"
            ) {

                return res.json(
                    buildFeeAnswer(
                        legacyService
                    )
                );

            }


            if (
                questionType ===
                "processing_time"
            ) {

                return res.json(
                    buildProcessingTimeAnswer(
                        legacyService
                    )
                );

            }


            if (
                questionType ===
                "application_process"
            ) {

                return res.json(
                    buildApplicationAnswer(
                        legacyService
                    )
                );

            }


            if (
                questionType ===
                "portal"
            ) {

                return res.json(
                    buildPortalAnswer(
                        legacyService
                    )
                );

            }


            const reply =
                await generateGeneralAIAnswer(
                    cleanMessage,
                    legacyService
                );


            res.json({

                success: true,

                reply,

                matched_services:
                    relevantServices.map(
                        item => ({
                            service_id:
                                item.service_id,

                            service_name:
                                item.service_name
                        })
                    )

            });


        } catch (error) {

            console.error(
                "AI assistant error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "The AI assistant is temporarily unavailable."

            });

        }

    }
);


/* =====================================================
   HOME / HEALTH CHECK
===================================================== */

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "EazyGovt backend is running!"

        });

    }
);


/* =====================================================
   DATABASE CONNECTION TEST
===================================================== */

app.get(
    "/api/db-test",
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    "SELECT NOW()"
                );


            res.json({

                success: true,

                message:
                    "EazyGovt database connection is working!",

                database_time:
                    result.rows[0].now

            });


        } catch (error) {

            console.error(
                "Database connection error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Database connection failed."

            });

        }

    }
);


/* =====================================================
   GET ALL ACTIVE SERVICES
===================================================== */

app.get(
    "/api/services",
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        s.service_id,
                        s.service_name,
                        s.description,
                        c.name AS category,
                        d.name AS department,
                        s.scope,
                        s.status,
                        s.processing_time,
                        s.fees,
                        s.application_process,
                        s.important_notes

                    FROM services s

                    JOIN categories c
                        ON s.category_id =
                           c.category_id

                    LEFT JOIN departments d
                        ON s.department_id =
                           d.department_id

                    WHERE s.status =
                          'Active'

                    ORDER BY
                        s.service_id;
                    `
                );


            res.json({

                success: true,

                count:
                    result.rows.length,

                services:
                    result.rows

            });


        } catch (error) {

            console.error(
                "Services API error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to fetch services."

            });

        }

    }
);


/* =====================================================
   GET ONE SERVICE BY ID
===================================================== */

app.get(
    "/api/services/:id",
    async (req, res) => {

        try {

            const serviceId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    serviceId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid service ID."

                });

            }


            const service =
                await getServiceKnowledge(
                    serviceId
                );


            if (!service) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Service not found."

                });

            }


            res.json({

                success: true,

                service:
                    service

            });


        } catch (error) {

            console.error(
                "Single service API error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to fetch service details."

            });

        }

    }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `EazyGovt backend running on http://localhost:${PORT}`
        );

    }
);