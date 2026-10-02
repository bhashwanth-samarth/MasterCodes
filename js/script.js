/* =========================================================
   THUNDER PORTFOLIO — script.js
   Lenis + GSAP + ScrollTrigger + Canvas Lightning Engine
   ========================================================= */

(() => {
    "use strict";

    /* =========================================================
       1. DOM READY
       ========================================================= */

    document.addEventListener("DOMContentLoaded", () => {
        initLenis();
        initLightningCursor();
        initCardLighting();
        initGSAPAnimations();
    });


    /* =========================================================
       2. LENIS + GSAP INTEGRATION
       ========================================================= */

    function initLenis() {
        if (typeof Lenis === "undefined") {
            console.warn("Lenis is not loaded.");
            return;
        }

        if (typeof gsap === "undefined") {
            console.warn("GSAP is not loaded.");
            return;
        }

        if (typeof ScrollTrigger === "undefined") {
            console.warn("GSAP ScrollTrigger is not loaded.");
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const exponentialEase = (t) =>
            Math.min(1, 1.001 - Math.pow(2, -10 * t));

        const lenis = new Lenis({
            duration: 1.2,
            easing: exponentialEase,
            smoothWheel: true,
            smoothTouch: false,
            syncTouch: false,
            wheelMultiplier: 1,
            touchMultiplier: 1
        });

        /*
         * Sync Lenis with ScrollTrigger
         */
        lenis.on("scroll", ScrollTrigger.update);

        /*
         * Bind Lenis RAF directly to GSAP ticker
         */
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        /*
         * Prevent GSAP from lag smoothing the Lenis loop.
         * This keeps the scrolling physics responsive.
         */
        gsap.ticker.lagSmoothing(0);

        /*
         * Make Lenis available globally if you want
         * to control scrolling from other scripts.
         */
        window.thunderLenis = lenis;

        /*
         * Refresh ScrollTrigger after initialization.
         */
        requestAnimationFrame(() => {
            ScrollTrigger.refresh();
        });
    }


    /* =========================================================
       3. LIGHTNING CURSOR ENGINE
       ========================================================= */

    function initLightningCursor() {
        const canvas = document.getElementById("lightning-canvas");

        if (!canvas) {
            console.warn("#lightning-canvas was not found.");
            return;
        }

        const ctx = canvas.getContext("2d");

        if (!ctx) {
            console.warn("Canvas 2D context could not be created.");
            return;
        }

        let width = window.innerWidth;
        let height = window.innerHeight;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);

        /*
         * -----------------------------------------------------
         * Mouse state
         * -----------------------------------------------------
         */

        const mouse = {
            x: width / 2,
            y: height / 2
        };

        const targetMouse = {
            x: width / 2,
            y: height / 2
        };

        let mouseHistory = [];

        const MAX_HISTORY = 12;

        /*
         * -----------------------------------------------------
         * Utility functions
         * -----------------------------------------------------
         */

        function lerp(start, end, amount) {
            return start + (end - start) * amount;
        }

        function random(min, max) {
            return Math.random() * (max - min) + min;
        }

        function distance(a, b) {
            const dx = b.x - a.x;
            const dy = b.y - a.y;

            return Math.sqrt(dx * dx + dy * dy);
        }

        /*
         * -----------------------------------------------------
         * Canvas resize
         * -----------------------------------------------------
         */

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        window.addEventListener("resize", resizeCanvas, {
            passive: true
        });

        resizeCanvas();


        /* =====================================================
           4. POINTER TRACKING
           ===================================================== */

        window.addEventListener(
            "pointermove",
            (event) => {
                targetMouse.x = event.clientX;
                targetMouse.y = event.clientY;
            },
            { passive: true }
        );


        /* =====================================================
           5. RECURSIVE MIDPOINT DISPLACEMENT
           ===================================================== */

        function createLightningPath(start, end, displacement, iterations) {
            const points = [];

            function subdivide(a, b, amount, depth) {
                if (depth <= 0) {
                    points.push({
                        x: b.x,
                        y: b.y
                    });

                    return;
                }

                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;

                const dx = b.x - a.x;
                const dy = b.y - a.y;

                const length = Math.sqrt(dx * dx + dy * dy);

                if (length === 0) {
                    points.push({
                        x: b.x,
                        y: b.y
                    });

                    return;
                }

                /*
                 * Perpendicular vector
                 */
                const perpendicularX = -dy / length;
                const perpendicularY = dx / length;

                /*
                 * Decreasing displacement at every recursion.
                 */
                const jitter =
                    (Math.random() * 2 - 1) * amount;

                const midpoint = {
                    x: midX + perpendicularX * jitter,
                    y: midY + perpendicularY * jitter
                };

                subdivide(
                    a,
                    midpoint,
                    amount * 0.55,
                    depth - 1
                );

                subdivide(
                    midpoint,
                    b,
                    amount * 0.55,
                    depth - 1
                );
            }

            points.push({
                x: start.x,
                y: start.y
            });

            subdivide(
                start,
                end,
                displacement,
                iterations
            );

            return points;
        }


        /* =====================================================
           6. CREATE COMPLETE LIGHTNING BOLT
           ===================================================== */

        function createBoltFromHistory() {
            if (mouseHistory.length < 2) {
                return [];
            }

            const bolt = [];

            /*
             * History is newest -> oldest.
             * Reverse it so the lightning follows the cursor path.
             */
            const history = [...mouseHistory].reverse();

            for (let i = 0; i < history.length - 1; i++) {
                const start = history[i];
                const end = history[i + 1];

                const segmentDistance = distance(start, end);

                /*
                 * Skip extremely tiny segments.
                 */
                if (segmentDistance < 0.5) {
                    continue;
                }

                const displacement = Math.min(
                    24,
                    Math.max(3, segmentDistance * 0.28)
                );

                const iterations =
                    segmentDistance > 100 ? 4 :
                    segmentDistance > 40 ? 3 :
                    2;

                const segment = createLightningPath(
                    start,
                    end,
                    displacement,
                    iterations
                );

                /*
                 * Avoid duplicate points between segments.
                 */
                if (bolt.length > 0) {
                    segment.shift();
                }

                bolt.push(...segment);
            }

            return bolt;
        }


        /* =====================================================
           7. DRAW LIGHTNING PATH
           ===================================================== */

        function drawLightningPath(
            points,
            color,
            lineWidth,
            shadowBlur,
            alpha
        ) {
            if (points.length < 2) {
                return;
            }

            ctx.save();

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.shadowColor = color;
            ctx.shadowBlur = shadowBlur;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();

            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(
                    points[i].x,
                    points[i].y
                );
            }

            ctx.stroke();

            ctx.restore();
        }


        /* =====================================================
           8. ELECTRIC BRANCH SPARKS
           ===================================================== */

        function drawBranchSpark(
            origin,
            angle,
            length,
            alpha
        ) {
            const points = [];

            let current = {
                x: origin.x,
                y: origin.y
            };

            points.push({
                x: current.x,
                y: current.y
            });

            const segments = Math.floor(
                random(2, 5)
            );

            const segmentLength =
                length / segments;

            let currentAngle = angle;

            for (let i = 0; i < segments; i++) {
                currentAngle += random(-0.65, 0.65);

                current = {
                    x:
                        current.x +
                        Math.cos(currentAngle) *
                        segmentLength,

                    y:
                        current.y +
                        Math.sin(currentAngle) *
                        segmentLength
                };

                points.push({
                    x: current.x,
                    y: current.y
                });
            }

            /*
             * Outer spark glow
             */
            drawLightningPath(
                points,
                "#00e5ff",
                random(0.5, 1.4),
                8,
                alpha
            );

            /*
             * White spark core
             */
            drawLightningPath(
                points,
                "#ffffff",
                0.45,
                3,
                alpha * 0.9
            );
        }


        function drawRandomBranches(points) {
            if (points.length < 5) {
                return;
            }

            /*
             * Number of sparks scales with bolt size.
             */
            const branchCount = Math.min(
                8,
                Math.max(
                    1,
                    Math.floor(points.length / 15)
                )
            );

            for (let i = 0; i < branchCount; i++) {
                /*
                 * Avoid always spawning branches at endpoints.
                 */
                const index = Math.floor(
                    random(2, points.length - 2)
                );

                const origin = points[index];

                /*
                 * Estimate direction from neighboring points.
                 */
                const previous = points[index - 1];
                const next = points[index + 1];

                const dx = next.x - previous.x;
                const dy = next.y - previous.y;

                const baseAngle =
                    Math.atan2(dy, dx);

                /*
                 * Branch shoots approximately perpendicular
                 * to the main bolt.
                 */
                const direction =
                    baseAngle +
                    (Math.random() > 0.5
                        ? Math.PI / 2
                        : -Math.PI / 2);

                drawBranchSpark(
                    origin,
                    direction + random(-0.5, 0.5),
                    random(8, 28),
                    random(0.25, 0.8)
                );
            }
        }


        /* =====================================================
           9. LIGHTNING PARTICLE FLASH
           ===================================================== */

        function drawCursorCore() {
            const radius = 1.8;

            ctx.save();

            ctx.beginPath();

            ctx.arc(
                mouse.x,
                mouse.y,
                radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#00e5ff";
            ctx.shadowBlur = 15;

            ctx.fill();

            ctx.restore();
        }


        /* =====================================================
           10. MAIN CANVAS RENDER LOOP
           ===================================================== */

        function renderLightning() {
            /*
             * Clear the entire canvas.
             */
            ctx.clearRect(
                0,
                0,
                width,
                height
            );

            /*
             * Smooth cursor physics.
             */
            mouse.x = lerp(
                mouse.x,
                targetMouse.x,
                0.28
            );

            mouse.y = lerp(
                mouse.y,
                targetMouse.y,
                0.28
            );

            /*
             * Add current position to history.
             */
            mouseHistory.unshift({
                x: mouse.x,
                y: mouse.y
            });

            /*
             * Keep only the newest 12 positions.
             */
            if (mouseHistory.length > MAX_HISTORY) {
                mouseHistory.length = MAX_HISTORY;
            }

            /*
             * Generate lightning.
             */
            const bolt = createBoltFromHistory();

            if (bolt.length >= 2) {
                /*
                 * PASS 1
                 * Outer neon cyan energy.
                 */
                drawLightningPath(
                    bolt,
                    "#00e5ff",
                    4.5,
                    20,
                    0.42
                );

                /*
                 * PASS 2
                 * Brighter cyan body.
                 */
                drawLightningPath(
                    bolt,
                    "#00e5ff",
                    2.1,
                    12,
                    0.85
                );

                /*
                 * PASS 3
                 * White-hot plasma core.
                 */
                drawLightningPath(
                    bolt,
                    "#ffffff",
                    0.9,
                    5,
                    0.95
                );

                /*
                 * Random electric branches.
                 */
                drawRandomBranches(bolt);
            }

            /*
             * Small white cursor core.
             */
            drawCursorCore();

            requestAnimationFrame(renderLightning);
        }

        renderLightning();
    }


    /* =========================================================
       11. INTERACTIVE CARD LIGHTING
       ========================================================= */

    function initCardLighting() {
        const cards = document.querySelectorAll(".card");

        if (!cards.length) {
            return;
        }

        cards.forEach((card) => {
            card.addEventListener(
                "mousemove",
                (event) => {
                    const rect =
                        card.getBoundingClientRect();

                    const x =
                        event.clientX - rect.left;

                    const y =
                        event.clientY - rect.top;

                    card.style.setProperty(
                        "--mouse-x",
                        `${x}px`
                    );

                    card.style.setProperty(
                        "--mouse-y",
                        `${y}px`
                    );
                },
                { passive: true }
            );

            card.addEventListener(
                "mouseleave",
                () => {
                    card.style.setProperty(
                        "--mouse-x",
                        "50%"
                    );

                    card.style.setProperty(
                        "--mouse-y",
                        "50%"
                    );
                }
            );
        });
    }


    /* =========================================================
       12. GSAP ANIMATIONS
       ========================================================= */

    function initGSAPAnimations() {
        if (typeof gsap === "undefined") {
            console.warn("GSAP is not loaded.");
            return;
        }

        if (typeof ScrollTrigger === "undefined") {
            console.warn("ScrollTrigger is not loaded.");
            return;
        }

        gsap.registerPlugin(ScrollTrigger);


        /* =====================================================
           HERO ENTRY TIMELINE
           ===================================================== */

        const heroTimeline = gsap.timeline({
            defaults: {
                ease: "power3.out"
            }
        });

        /*
         * Subtitle
         */
        if (document.querySelector(".hero-subtitle")) {
            heroTimeline.from(
                ".hero-subtitle",
                {
                    opacity: 0,
                    y: 25,
                    duration: 0.7
                },
                0.15
            );
        }

        /*
         * Main title
         */
        if (document.querySelector(".hero-title")) {
            heroTimeline.from(
                ".hero-title",
                {
                    opacity: 0,
                    y: 55,
                    scale: 0.97,
                    duration: 1
                },
                0.3
            );
        }

        /*
         * Description
         */
        if (document.querySelector(".hero-description")) {
            heroTimeline.from(
                ".hero-description",
                {
                    opacity: 0,
                    y: 30,
                    duration: 0.8
                },
                0.55
            );
        }

        /*
         * CTA
         */
        if (document.querySelector(".cta-btn")) {
            heroTimeline.from(
                ".cta-btn",
                {
                    opacity: 0,
                    y: 25,
                    scale: 0.94,
                    duration: 0.7
                },
                0.75
            );
        }


        /* =====================================================
           CARD SCROLL ANIMATION
           ===================================================== */

        const cards = gsap.utils.toArray(".card");

        if (cards.length) {
            gsap.set(cards, {
                opacity: 0,
                y: 60,
                scale: 0.96
            });

            ScrollTrigger.batch(cards, {
                start: "top 88%",

                onEnter: (batch) => {
                    gsap.to(batch, {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.8,
                        ease: "power3.out",
                        stagger: 0.12,
                        overwrite: true
                    });
                },

                once: true
            });
        }


        /* =====================================================
           REFRESH SCROLLTRIGGER
           ===================================================== */

        window.addEventListener(
            "load",
            () => {
                ScrollTrigger.refresh();
            },
            { once: true }
        );
    }

    // =========================================================
// COURSE DATA & MODAL INTERACTION LOGIC
// =========================================================

const courseData = {
  "c-programming": {
    badge: "⚡ CODE CORE",
    title: "C Programming Masterclass",
    desc: "Master memory allocation, pointers, data structures, and foundational programming logic.",
    level: "Beginner",
    duration: "6 Weeks",
    modules: "8 Modules",
    syllabus: [
      "Module 01: Environment Setup & Syntax Basics",
      "Module 02: Variables, Data Types & Operators",
      "Module 03: Control Structures & Loops",
      "Module 04: Functions & Scope",
      "Module 05: Arrays & Strings",
      "Module 06: Memory Management & Pointers",
      "Module 07: Structures & File I/O",
      "Module 08: Mini Project — Student Management System"
    ]
  },
  "web-dev": {
    badge: "⚡ WEB STRIKE",
    title: "Modern Web Development",
    desc: "Build sleek, responsive web applications using HTML5, CSS3, JavaScript, and Glassmorphism techniques.",
    level: "Beginner to Pro",
    duration: "8 Weeks",
    modules: "10 Modules",
    syllabus: [
      "Module 01: HTML5 Semantic Markup",
      "Module 02: CSS3 Layouts, Flexbox & Grid",
      "Module 03: UI Design & Glassmorphism Styles",
      "Module 04: JavaScript Core Concepts",
      "Module 05: DOM Manipulation & Dynamic UI",
      "Module 06: Async JavaScript & APIs",
      "Module 07: Git & GitHub Workflow",
      "Module 08: Capstone Project — Portfolio Web App"
    ]
  },
  "python": {
    badge: "⚡ PYTHON POWER",
    title: "Python Programming & Automation",
    desc: "Learn modern Python syntax, object-oriented programming, data processing, and scripting.",
    level: "Beginner",
    duration: "6 Weeks",
    modules: "7 Modules",
    syllabus: [
      "Module 01: Python Fundamentals & Data Structures",
      "Module 02: Conditional Logic & Loops",
      "Module 03: Functions & Modules",
      "Module 04: Object-Oriented Programming (OOP)",
      "Module 05: File Handling & Automation Scripts",
      "Module 06: Working with APIs & Web Scraping",
      "Module 07: Project — Expense Tracker App"
    ]
},
"java": {
    badge: "⚡ JAVA ENGINE",
    title: "Java Enterprise Programming",
    desc: "Master object-oriented design, multithreading, collections framework, and backend application development.",
    level: "Intermediate",
    duration: "8 Weeks",
    modules: "8 Modules",
    syllabus: [
      "Module 01: Java JVM & Syntax Basics",
      "Module 02: OOP Principles (Inheritance, Polymorphism)",
      "Module 03: Exception Handling & Logging",
      "Module 04: Java Collections Framework",
      "Module 05: Streams API & Lambda Expressions",
      "Module 06: Multithreading & Concurrency",
      "Module 07: JDBC & Database Integration",
      "Module 08: Project — Banking System Console App"
    ]
  },
  "dsa": {
    badge: "⚡ ALGORITHM STRIKE",
    title: "Data Structures & Algorithms",
    desc: "Solve complex computational problems using trees, graphs, dynamic programming, and Big-O optimization.",
    level: "Intermediate",
    duration: "10 Weeks",
    modules: "9 Modules",
    syllabus: [
      "Module 01: Time & Space Complexity (Big-O Analysis)",
      "Module 02: Arrays, Strings & Two-Pointer Patterns",
      "Module 03: Stacks, Queues & Linked Lists",
      "Module 04: Recursion & Backtracking",
      "Module 05: Trees, BST & Binary Heaps",
      "Module 06: Graphs & Shortest Path Algorithms",
      "Module 07: Sorting & Searching Strategies",
      "Module 08: Dynamic Programming Fundamentals",
      "Module 09: Capstone — LeetCode High-Frequency Patterns"
    ]
  },
  "ai-ml": {
    badge: "⚡ THUNDER AI",
    title: "AI & Machine Learning Engineering",
    desc: "Build predictive models, neural networks, and computer vision apps using Python, NumPy, Pandas, and PyTorch.",
    level: "Advanced",
    duration: "12 Weeks",
    modules: "10 Modules",
    syllabus: [
      "Module 01: Linear Algebra & Matrix Math for ML",
      "Module 02: Data Analysis with Pandas & NumPy",
      "Module 03: Supervised Learning (Regression & Classification)",
      "Module 04: Unsupervised Learning & Clustering",
      "Module 05: Model Evaluation & Hyperparameter Tuning",
      "Module 06: Introduction to Deep Learning & PyTorch",
      "Module 07: Convolutional Neural Networks (CNNs)",
      "Module 08: Natural Language Processing (NLP)",
      "Module 09: Model Deployment with FastAPI",
      "Module 10: Capstone — Image Classification Model"
    ]
  },
"challenge-001": {
     badge: "⚡ EASY",
     title: "CHALLENGE #001: Prime Number Check",
     desc: "Write an optimized C program to check whether a given integer is a prime number using square root trial division.",
     level: "Beginner",
     duration: "15 Mins",
     modules: "1 Problem",
     syllabus: [
       "Task: Read an integer input from the user",
       "Logic: Check divisibility up to sqrt(N)",
       "Edge Cases: Handle numbers <= 1 gracefully",
       "Output: Print whether the number is Prime or Not Prime"
     ]
   }
 };
 
  window.openCourse = function(courseKey) {
  const data = courseData[courseKey];
  if (!data) return;

  document.getElementById("modal-badge").innerText = data.badge;
  document.getElementById("modal-title").innerText = data.title;
  document.getElementById("modal-desc").innerText = data.desc;
  document.getElementById("modal-level").innerText = data.level;
  document.getElementById("modal-duration").innerText = data.duration;
  document.getElementById("modal-modules").innerText = data.modules;

  const syllabusList = document.getElementById("modal-syllabus");
  syllabusList.innerHTML = data.syllabus.map(item => `<li>${item}</li>`).join("");

  const modal = document.getElementById("course-modal");
  if (modal) modal.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("course-modal");
  const closeBtn = document.getElementById("modal-close");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  }

  if (modal) {
    const overlay = modal.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => modal.classList.remove("active"));
    }
  }
});

})();