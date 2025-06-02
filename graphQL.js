const GRAPHQL_ENDPOINT = "https://01.gritlab.ax/api/graphql-engine/v1/graphql";
const AUTH_ENDPOINT = "https://01.gritlab.ax/api/auth/signin";

const form = document.getElementById("login-form");
const errMsg = document.getElementById("error-message");
const loginSec = document.getElementById("login-section");
const profSec = document.getElementById("profile-section");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errMsg.textContent = "";
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  const creds = btoa(`${user}:${pass}`);

  try {
    const res = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}` },
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const responseData = await res.json();
    const token = responseData.token || responseData;
    localStorage.setItem("jwt", token);
    loginSec.style.display = "none";
    profSec.style.display = "block";
    await showProfile(token);
  } catch (err) {
    errMsg.textContent = err.message;
  }
});

async function showProfile(token) {
  const query = `
{
  userInfo: user {
    id
    campus
    login
    email
    firstName
    lastName
    auditRatio
    totalUp
    totalUpBonus
    totalDown
  }

  xpTransactions: transaction(
    where: {type: {_eq: "xp"}, _and: [{object: {type: {_neq: "piscine"}}}, {path: {_nlike: "%piscine-js/%"}}, {path: {_nlike: "%checkpoint%"}}]}
    order_by: {createdAt: asc}
  ) {
    amount
    path
    object {
      type
      name
    }
    createdAt
  }

  xpSum: transaction_aggregate(where: { type: { _eq: "xp" } }) {
    aggregate { sum { amount } }
  }

  xpSchool: transaction_aggregate(
    where: {
      _and: [
        { type: { _eq: "xp" } },
        { path: { _nlike: "%piscine-go/%" } },
        { path: { _nlike: "%piscine-js/%" } }
      ]
    }
  ) {
    aggregate { sum { amount } }
  }

  xpPiscineGo: transaction_aggregate(
    where: {
      _and: [
        { type: { _eq: "xp" } },
        { path: { _like: "%piscine-go/%" } }
      ]
    }
  ) {
    aggregate { sum { amount } }
  }

  xpPiscineJs: transaction_aggregate(
    where: {
      _and: [
        { type: { _eq: "xp" } },
        { path: { _like: "%piscine-js/%" } }
      ]
    }
  ) {
    aggregate { sum { amount } }
  }
}
`;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
  const { data, errors } = await res.json();

  const totalXP = data.xpSum.aggregate.sum.amount;
  const schoolXP = data.xpSchool.aggregate.sum.amount;
  const goXP = data.xpPiscineGo.aggregate.sum.amount;
  const jsXP = data.xpPiscineJs.aggregate.sum.amount;

  if (errors) {
    console.error(errors);
    errMsg.textContent = "Error loading profile.";
    return;
  }

  fillProfile(data, totalXP, schoolXP, goXP, jsXP);
  const projectTx = data.xpTransactions.filter(
    (tx) => tx.object.type === "project"
  );
  const exerciseTx = data.xpTransactions.filter(
    (tx) => tx.object.type === "exercise"
  );
  renderProjectXpGraph(projectTx);
  renderExerciseXpGraph(exerciseTx);
}

function fillProfile({ userInfo }, totalXP, schoolXP, goXP, jsXP) {
  const user = userInfo[0];
  document.getElementById(
    "welcome-name"
  ).textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById("info-campus").textContent = user.campus;
  document.getElementById("info-login").textContent = user.login;
  document.getElementById("info-fname").textContent = user.firstName;
  document.getElementById("info-lname").textContent = user.lastName;
  document.getElementById("info-email").textContent = user.email;

  document.getElementById("stat-xp").textContent = `Total: ${formatXP(
    totalXP,
    "Total"
  )}  |  School: ${formatXP(schoolXP, "School")}  |  Piscine Go: ${formatXP(
    goXP,
    "Piscine Go"
  )}  |  Piscine JS: ${formatXP(jsXP, "Piscine JS")}`;
  document.getElementById("stat-audit").textContent =
    user.auditRatio.toFixed(1);

  document.getElementById("stat-done").textContent = formatXP(
    user.totalUp,
    "Done"
  );
  document.getElementById("stat-bonus").textContent =
    "+ " + formatXP(user.totalUpBonus, "Bonus");
  document.getElementById("stat-received").textContent = formatXP(
    user.totalDown,
    "Received"
  );
}

function formatXP(xp, label) {
  if (xp >= 1_000_000) {
    const mb = xp / 1_000_000;
    if (label === "Received") {
      return mb.toFixed(2) + " MB"; // round for Received
    }
    return Math.floor(mb * 100) / 100 + " MB"; // truncate for others
  } else if (xp >= 1_000) {
    const kb = xp / 1_000;
    if (label === "Bonus") {
      return kb.toFixed(2) + " kB"; // round for Bonus
    }
    return Math.ceil(kb) + " kB"; // round UP for others
  }
  return xp + " B";
}

function renderProjectXpGraph(data) {
  const svg = document.getElementById("project-xp-graph");
  svg.innerHTML = "";

  const svgW = svg.clientWidth;
  const svgH = svg.clientHeight;
  const baseY = svgH - 40;
  const maxVal = Math.max(...data.map((d) => d.amount), 0);

  const gap = 12;
  const barW = (svgW - gap * (data.length + 1)) / data.length;

  data.forEach((d, i) => {
    const val = d.amount;
    const name = d.object.name;
    const h = (val / maxVal) * (svgH - 80);
    const x = gap + i * (barW + gap);
    const y = baseY - h;

    // Draw the bar
    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barW);
    rect.setAttribute("height", h);
    rect.setAttribute("fill", "#4CAF50");
    svg.appendChild(rect);

    // Project name, rotated –90° around its own center point
    const label = document.createElementNS(svg.namespaceURI, "text");
    const lx = x + barW / 2;
    const ly = y + h / 2;

    // place it at (lx, ly) and then rotate 90° counter-clockwise around that point
    label.setAttribute("x", lx);
    label.setAttribute("y", ly);
    label.setAttribute("transform", `rotate(-90 ${lx} ${ly})`);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "bar-label");
    label.textContent = name;
    svg.appendChild(label);

    // XP value (just above the top of bar)
    const vtext = document.createElementNS(svg.namespaceURI, "text");
    vtext.setAttribute("x", x + barW / 2);
    vtext.setAttribute("y", y - 6);
    vtext.setAttribute("text-anchor", "middle");
    vtext.setAttribute("class", "value-label");
    vtext.textContent = val;
    svg.appendChild(vtext);
  });
}

(async () => {
  const token = localStorage.getItem("jwt");
  if (token) {
    loginSec.style.display = "none";
    profSec.style.display = "block";
    await showProfile(token);
  }
})();

function renderExerciseXpGraph(data) {
  // 1) Grab the SVG and clear it
  const svg = document.getElementById("exercise-xp-graph");
  svg.innerHTML = "";

  // 2) Dimensions and margins
  const svgW = svg.clientWidth; // e.g. 1000px
  const svgH = svg.clientHeight; // e.g. 400px
  const topMargin = 40;
  const bottomMargin = 40;
  const chartHeight = svgH - topMargin - bottomMargin; // 320px
  const baseY = svgH - bottomMargin; // y=360

  // 3) How many points (exercises) do we have?
  const N = data.length;
  // If N=1, we'll center the single point; otherwise spread evenly across the width:
  const gapX = N > 1 ? svgW / (N - 1) : 0;

  // 4) Find max XP so we can scale vertically
  const maxXP = Math.max(...data.map((d) => d.amount), 0);

  // 5) Build “linePoints” and “areaPoints”
  const linePoints = [];
  const areaPoints = [];

  data.forEach((d, i) => {
    const x = N === 1 ? svgW / 2 : gapX * i;
    const y = maxXP === 0 ? baseY : baseY - (d.amount / maxXP) * chartHeight;

    linePoints.push(`${x},${y}`);
    areaPoints.push(`${x},${y}`);
  });

  // 6) Draw the “area under the line” polygon
  const areaString = [`0,${baseY}`, ...areaPoints, `${svgW},${baseY}`].join(
    " "
  );

  const poly = document.createElementNS(svg.namespaceURI, "polygon");
  poly.setAttribute("points", areaString);
  poly.setAttribute("fill", "rgba(76, 175, 80, 0.3)"); // translucent green
  svg.appendChild(poly);

  // 7) Draw the line on top of the polygon
  const pline = document.createElementNS(svg.namespaceURI, "polyline");
  pline.setAttribute("points", linePoints.join(" "));
  pline.setAttribute("fill", "none");
  pline.setAttribute("stroke", "#4CAF50");
  pline.setAttribute("stroke-width", "2");
  svg.appendChild(pline);

  // 8) Now add circles + tooltip listeners for each point
  data.forEach((d, i) => {
    const x = N === 1 ? svgW / 2 : gapX * i;
    const y = maxXP === 0 ? baseY : baseY - (d.amount / maxXP) * chartHeight;

    // a) Create the circle
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 3);
    circle.setAttribute("fill", "#388E3C"); // darker green
    svg.appendChild(circle);

    // b) Set up the custom tooltip behavior
    const tooltip = document.getElementById("tooltip");

    circle.addEventListener("mouseover", (evt) => {
      tooltip.textContent = `${d.object.name}: ${d.amount} XP`;
      const pageX = evt.pageX;
      const pageY = evt.pageY;
      tooltip.style.left = `${pageX}px`;
      tooltip.style.top = `${pageY}px`;
      tooltip.style.display = "block";
    });

    circle.addEventListener("mouseout", () => {
      tooltip.style.display = "none";
    });
  });
}

const logoutBtn = document.getElementById("logout-btn");
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("jwt");
  profSec.style.display = "none";
  loginSec.style.display = "block";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  errMsg.textContent = "";
});
