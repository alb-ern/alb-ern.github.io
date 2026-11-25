<style>
body {
  padding-top: 68px !important;
}
.subtab-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 24px;
  background: #171a21;
  border-bottom: 1px solid #2a475e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
}
.subtab-btn {
  appearance: none;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  height: 48px;
  padding: 0 18px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c7d5e0;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}
.subtab-btn:hover {
  color: #ffffff;
  background: rgba(102, 192, 244, 0.12);
}
.subtab-btn.is-active {
  color: #66c0f4;
  border-bottom-color: #66c0f4;
  background: rgba(102, 192, 244, 0.16);
}
.subtab-pane {
  display: none;
}
.subtab-pane.is-active {
  display: block;
}
/* When Hobby Projects tab is active, hide the Jekyll theme header/footer (name & sidebar) completely */
body.is-hobby-tab .wrapper > header,
body.is-hobby-tab .wrapper > footer {
  display: none !important;
}
body.is-hobby-tab .wrapper > section {
  float: none !important;
  width: 100% !important;
  max-width: 720px !important;
  margin: 0 auto !important;
}
</style>

<nav class="subtab-bar" role="tablist" aria-label="Site Sections">
  <button type="button" class="subtab-btn is-active" id="tabbtn-main" role="tab" aria-selected="true" onclick="switchSiteTab('main')">Main</button>
  <button type="button" class="subtab-btn" id="tabbtn-hobby" role="tab" aria-selected="false" onclick="switchSiteTab('hobby')">Hobby Projects</button>
</nav>

<div id="tab-main" class="subtab-pane is-active" markdown="1">

# Alperen Akkan
Computer Engineering @ İTÜ

[GitHub](https://github.com/alb-ern) | [LinkedIn](https://linkedin.com/in/alperen-akkan) | [Email](mailto:akkan23@itu.edu.tr)

---

## Education
**Istanbul Technical University (İTÜ)**
Bachelor of Science in Computer Engineering
*Sept. 2023 - June 2028*

## Technical Skills
* **Languages:** Python, SQL (Postgres), C/C++
* **Frameworks & Tools:** Flask, Git, Docker, VS Code

## Projects
**Head-Controlled Game Interface** *(Jan. 2026)*
* **Stack:** Python, YOLOv8 (Pose), OpenCV
* Engineered a human-computer interaction system using YOLOv8 Pose Estimation to control a game via real-time head movements.
* Implemented a multi-threaded architecture to decouple the AI inference loop from the game loop.

**World Bank Data Visualization** *(Oct. 2025 - Jan. 2026)*
* **Stack:** Python, PostgreSQL, Flask, Javascript, Docker
* Developed a database for applying CRUD operations and viewing global economic indicator data.
* Conducted testing and validation of database components to ensure data accuracy.

**Py-Chat** *(Aug. 2025)*
* **Stack:** Python, Threading
* Engineered a multi-threaded architecture to handle streams, ensuring real-time message delivery.
* Handled network exceptions and client disconnections to ensure stability and resource cleanup.

## Leadership & Activities
**Board Member @ ITU AI Club** *(Sept. 2025 - Present)*
* Directed a technical team of 10+ members to manage logistics and stage technicals for the AI Summit (500+ attendees).
* Served as an active member of the Executive Board for strategic decision-making.

## Certifications
* NVIDIA DLI: Fundamentals of Deep Learning (2025)
* Cisco: Introduction to Modern AI (2026)

</div>

<div id="tab-hobby" class="subtab-pane" markdown="1">

## Hobby Projects

**[Ball VS Ball — Web Arena Edition](https://alb-ern.github.io/ballwar/)**
* **Stack:** JavaScript, HTML5 Canvas, WebRTC (PeerJS), Web Audio API
* 1v1 & 2v2 physics arena auto-battler with 120 unique balls, Sandbox Lab, Local pass-and-play (2P/4P), and Online P2P multiplayer (Quickmatch 1v1 + Private 2P/4P rooms).
* **[Play Ball VS Ball →](https://alb-ern.github.io/ballwar/)**

</div>

<script>
function switchSiteTab(tab) {
  var isHobby = tab === 'hobby';
  document.body.classList.toggle('is-hobby-tab', isHobby);
  document.getElementById('tab-main').classList.toggle('is-active', !isHobby);
  document.getElementById('tab-hobby').classList.toggle('is-active', isHobby);
  var btnMain = document.getElementById('tabbtn-main');
  var btnHobby = document.getElementById('tabbtn-hobby');
  btnMain.classList.toggle('is-active', !isHobby);
  btnHobby.classList.toggle('is-active', isHobby);
  btnMain.setAttribute('aria-selected', !isHobby ? 'true' : 'false');
  btnHobby.setAttribute('aria-selected', isHobby ? 'true' : 'false');
  if (history.replaceState) {
    history.replaceState(null, '', isHobby ? '#hobby' : window.location.pathname);
  }
}
if (window.location.hash === '#hobby') {
  switchSiteTab('hobby');
}
</script>
