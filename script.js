let students = JSON.parse(localStorage.getItem("students")) || [];
let classDetails = JSON.parse(localStorage.getItem("classDetails")) || {
  name: "Our Class",
  points: 0,
};

let historyStack = JSON.parse(localStorage.getItem("historyStack")) || [];
let classHistoryStack =
  JSON.parse(localStorage.getItem("classHistoryStack")) || [];

  let selectedStudents = new Set();
let modalEventListeners = [];
let savedQuery = "";

let shapes = [];
let eyes = [];
let mouths = [];
let glasses = [];

const colors = [
  ["Bright Orange", "#FF5733"],
  ["Warm Red", "#FF6F61"],
  ["Golden Yellow", "#FFCC33"],
  ["Bright Yellow", "#FFD700"],
  ["Grass Green", "#88B04B"],
  ["Deep Teal", "#009B77"],
  ["Sky Blue", "#00BFFF"],
  ["Cool Blue", "#5B5EA6"],
  ["Vivid Purple", "#6A0DAD"],
  ["Soft Purple", "#B565A7"],
  ["Light Pink", "#F7CAC9"],
  ["Coral", "#E15D44"],
  ["Magenta", "#D65076"],
  ["Warm Gold", "#EFC050"],
  ["Turquoise", "#7FCDCD"],
  ["Deep Pink", "#C3447A"],
  ["Dark Red", "#9B2335"],
  ["Aqua", "#55B4B0"],
  ["Light Beige (Neutral)", "#DFCFBE"],
];

// Generator functions for generating Avatars

function generateAvatar(index) {
  const student = students[index];
  const hash = stringToHash(student.name);

  // Update the student details with defaults if they are undefined
  student.color ??= hash % colors.length;
  student.shape ??= (hash % 100) % 7;
  student.eye ??= Math.floor((hash / 100) % 100) % 4;
  student.glass ??= 0;
  student.mouth ??= 0;

  // Use the stored indices to generate the SVG components
  const color = colors[student.color][1];
  const shape = getShape(student.shape, color);
  const eye = student.glass !== 0 ? glasses[student.glass] : eyes[student.eye];
  const mouth = mouths[student.mouth];

  return `
            <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                ${shape}
                ${eye}
                ${mouth}
            </svg>
        `;
}

function generateNewStudentAvatar() {
  const color = "darkgray";
  const shape = getShape(7, color);
  const eye = eyes[3];
  const mouth = mouths[3];
  return `<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <g opacity="0.25">
              ${shape}
              ${eye}
              ${mouth}
              </g>
          </svg>`;
}

function generateClassAvatar() {
  let avatars = "";
  const numberOfAvatars = 9;
  const size = 100;
  const scale = 0.6;

  for (let i = 0; i < numberOfAvatars; i++) {
    const color = colors[(i * 4) % colors.length][1];
    const shape = getShape(i % 7, color);
    const eye = eyes[i % 4];
    const mouth = mouths[i % 4];

    const posX = (i % 3) * (size / 2) - 12;
    const posY = Math.floor(i / 3) * (size / 2) - 12;

    avatars += `<g transform="translate(${posX}, ${posY})">
                    ${shape}
                    ${eye}
                    ${mouth}
                </g>`;
  }

  return `<svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <g transform="scale(${scale})">
                  ${avatars}
              </g>
          </svg>`;
}

function getShape(index, color) {
  const template = shapes[index] //document.querySelector(`template[id="shape-${index}"]`);
  return Array.from(template.content.children)
    .map((el) => {
      el.setAttribute("fill", color);
      return el.outerHTML;
    })
    .join("")
    .trim();
}

// Render functions for rendering students, and student and class cards

function renderStudent(student, index) {
  const nameParts = student.name.split(" ");
  const points = student.points;
  const firstName = nameParts[0];
  const lastInitial = nameParts.length > 1 ? nameParts[1][0] + "." : "";
  const selectedClass = selectedStudents.has(index) ? "selected" : "";

  return `<div class="student-card ${selectedClass}" >
          <div class="avatar" onclick="toggleSelect(${index})">${generateAvatar(
    index
  )}</div>
          <div class="info">
            <button class="avatarSettings" onclick="showAvatarSettingsModal(${index})">…</button>
            <button class="delete" onclick="showConfirmationModal(deleteStudent, ${index})">X</button>
            <span class="name" onclick="toggleSelect(${index})">${firstName} ${lastInitial} <span class="points">${points}</span></span>
            <div class="pointsManage">
              <input type="number" min="-100" max="100" onchange="setPoints(${index}, this.value)" class="points-input">
              <button onclick="updatePoints(${index}, 1)">❤️</button>
              <button onclick="updatePoints(${index}, 5)">x5</button>
              <button onclick="updatePoints(${index}, 10)">x10</button>
            </div>
          </div>
        </div>`;
}

function renderNewStudent() {
  document.getElementById('newStudentAvatar').innerHTML = generateNewStudentAvatar();
}

function renderClass() {
    document.getElementById('className').value = classDetails.name;
    document.getElementById('classPoints').textContent = classDetails.points;
    document.getElementById('classAvatar').innerHTML = generateClassAvatar();
}

function renderStudents() {
  const container = document.querySelector("#studentsContainer");
  const classCardTemplate = document.querySelector("#classCardTemplate");
  const clonedClassTemplate = classCardTemplate.cloneNode(true);
  const newStudentCardTemplate = document.querySelector("#newStudentCardTemplate");
  const clonedNewStudentTemplate = newStudentCardTemplate.cloneNode(true);
  
  container.innerHTML =
    students
      .map((student, index) => {
        return renderStudent(student, index);
      })
      .join("")
    
  container.prepend(clonedClassTemplate);
  container.append(clonedNewStudentTemplate);
  renderClass();
  renderNewStudent();
}

// Data manipulation functions

function filterStudents() {
  const query =
    savedQuery || document.getElementById("searchInput").value.toLowerCase();
  const studentCards = document.querySelectorAll(".student-card");
  const clearButton = document.getElementById("clearButton");

  studentCards.forEach((card) => {
    const studentName = card.querySelector(".name").textContent.toLowerCase();
    card.style.display = studentName.includes(query) ? "flex" : "none";
  });

  clearButton.style.display = query ? "block" : "none";
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  savedQuery = "";
  filterStudents();
  document.getElementById("searchInput").focus();
}

function clearOnEscape(event) {
  if (event.key === "Escape") {
    clearSearch();
  }
}

function addNewStudent() {
  const newStudentName = document.querySelector("#newStudentName").value.trim();

  if (newStudentName) {
    saveState();
    students.push({ name: newStudentName, points: 0 });
    saveAndRender();
  } else {
    alert("Please enter a student name.");
  }
}

function toggleSelect(index) {
  if (selectedStudents.has(index)) {
    selectedStudents.delete(index);
  } else {
    selectedStudents.add(index);
  }
  saveAndRender();
}

function toggleSelectAll() {
  if (selectedStudents.size > 0) {
    selectedStudents.clear();
  } else {
    students.forEach((_, index) => {
      selectedStudents.add(index);
    });
  }
  saveAndRender();
}


function updatePoints(index, amount) {
  saveState();
  students[index].points += parseInt(amount);
  saveAndRender();
  animateHeart(amount);
  wiggleStudentCard(index);
}

function setClassPoints(amount) {
  saveState();
  classDetails.points = parseInt(amount);
  saveAndRender();
  wiggleClassCard();
}

function setClassName(name) {
  saveState();
  classDetails.name = name;
  saveAndRender();
}

function updateClassPoints(amount) {
  saveState();
  classDetails.points += parseInt(amount);
  saveAndRender();
  animateHeart(amount);
  wiggleClassCard();
}

function setPoints(index, amount) {
  saveState();
  students[index].points = parseInt(amount);
  saveAndRender();
  wiggleStudentCard(index);
}

function bulkUpdatePoints(amount) {
  if (selectedStudents.size > 0) {
    saveState();
    selectedStudents.forEach((index) => {
      students[index].points += amount;
      animateHeart(amount);
    });
    saveAndRender();
    selectedStudents.forEach((index) => {
      wiggleStudentCard(index);
    });
  }
}

function resetPoints() {
  saveState();
  if (selectedStudents.size === 0) {
    students.forEach((student) => {
      student.points = 0;
    });
    classDetails.points = 0;
  } else {
    selectedStudents.forEach((index) => {
      students[index].points = 0;
    });
  }
  saveAndRender();
}

function deleteStudent(index) {
  saveState();
  students.splice(index, 1);
  saveAndRender();
}

function sortStudentsByName() {
  selectedStudents.clear();
  saveState();
  students.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  saveAndRender();
}

function sortStudentsByScore() {
  selectedStudents.clear();
  saveState();
  students.sort((a, b) => b.points - a.points);
  saveAndRender();
}

function saveState() {
  if (historyStack.length >= 10) {
    historyStack.shift();
    classHistoryStack.shift();
  }
  historyStack.push(JSON.parse(JSON.stringify(students)));
  classHistoryStack.push(JSON.parse(JSON.stringify(classDetails)));
  localStorage.setItem("historyStack", JSON.stringify(historyStack));
  localStorage.setItem("classHistoryStack", JSON.stringify(classHistoryStack));
  updateUndoButton();
}

function updateUndoButton() {
  const undoButton = document.getElementById("undoButton");
  undoButton.disabled = historyStack.length === 0;
}

function undo() {
  if (historyStack.length > 0) {
    students = historyStack.pop();
    classDetails = classHistoryStack.pop();
    localStorage.setItem("historyStack", JSON.stringify(historyStack));
    localStorage.setItem(
      "classHistoryStack",
      JSON.stringify(classHistoryStack)
    );
    saveAndRender();
  }
  updateUndoButton();
}

function saveAndRender() {
  savedQuery = document.getElementById("searchInput").value.toLowerCase();
  renderStudents();
  filterStudents();
  localStorage.setItem("students", JSON.stringify(students));
  localStorage.setItem("classDetails", JSON.stringify(classDetails));
  enableDragAndDrop();
}

function exportCSV() {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    "Name,Points,Color,Shape,Eye,Glass,Hat,Mouth\n" + // Column headers
    classDetails.name +
    "," +
    classDetails.points +
    "\n" +
    students
      .map(
        (s) =>
          `${s.name},${s.points},${s.color},${s.shape},${s.eye},${s.glass},0,${s.mouth}`
      )
      .join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "students_backup.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function clickFileInput() {
  const fileInput = document.getElementById("fileInput");
  fileInput.click();
}

function importCSV(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split(/\r?\n/);

    // Extract the first line and store it in classDetails (with or without headers)
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const headers = [
        "Name",
        "Points",
        "Color",
        "Shape",
        "Eye",
        "Glass",
        "Hat",
        "Mouth",
      ];

      // Check if the first line contains headers (matching one of the new CSV formats)
      if (
        firstLine.split(",").length === headers.length &&
        firstLine.includes(headers[0])
      ) {
        // The first line contains the headers, so we skip it
        lines.shift();

        // Parse class details from the first student line (since there are no class details in the header)
        const [name, points] = lines[0].split(",");
        classDetails.name = name.trim();
        classDetails.points = parseInt(points) || 0;
      } else {
        // Backward compatibility: Handle cases without column headers
        const [name, points] = firstLine.split(",");
        classDetails.name = name.trim();
        classDetails.points = parseInt(points) || 0;
      }
    }

    lines.shift();

    // Process the remaining lines as students
    students = lines
      .map((line) => {
        const fields = line.split(",");

        if (fields.length >= 2) {
          const [name, points] = fields;
          // If the line has the expected number of columns (name, points, and new properties)
          if (fields.length === 8) {
            // Handle the new format with extra properties
            const [name, points, color, shape, eye, glass, hat, mouth] = fields;
            return {
              name: name.trim(),
              points: parseInt(points) || 0,
              color: parseInt(color) || 0,
              shape: parseInt(shape) || 0,
              eye: parseInt(eye) || 0,
              glass: parseInt(glass) || 0,
              hat: parseInt(hat) || 0,
              mouth: parseInt(mouth) || 0,
            };
          } else {
            // Handle the backward-compatible format with only name and points
            return { name: name.trim(), points: parseInt(points) || 0 };
          }
        }
      })
      .filter((student) => student.name); // Filter out any empty rows

    saveAndRender();
    event.target.value = ""; // Reset the file input
  };
  reader.readAsText(file);
}

// Animation functions

function wiggleStudentCard(index) {
  const studentCards = document.querySelectorAll(".student-card");
  const studentCard = studentCards[index]; // Adjust for the class row being first
  wiggleCard(studentCard);
}

function wiggleClassCard() {
  const classCards = document.querySelectorAll(".class-card");
  const classCard = classCards[0]; // Adjust for the class row being first
  wiggleCard(classCard);
}

function wiggleCard(card) {
  if (card) {
    card.classList.add("drag-over");
    setTimeout(() => {
      card.classList.remove("drag-over");
    }, 600);
  }
}

function launchConfetti() {
  const confettiContainer = document.getElementById("confetti");
  const numberOfConfetti = 1000;
  const tadaSound = document.getElementById("tadaSound");

  tadaSound.play();

  for (let i = 0; i < numberOfConfetti; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti-piece");

    confetti.style.backgroundColor = getRandomColor();
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.animationDuration = `${Math.random() * 2 + 3}s`;
    confetti.style.animationDelay = `${Math.random() * 2}s`;

    confettiContainer.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 3000);
  }
}

function getRandomColor() {
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#FF33A1",
    "#FFD700",
    "#00FF7F",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function animateHeart(amount) {
  const popSound = document.getElementById("popSound");

  popSound.play();
  for (let i = 0; i < amount; i++) {
    const heart = document.createElement("div");
    const emojis = [
      "😍",
      "🥰",
      "😻",
      "😘",
      "❤️‍🔥",
      "💜",
      "💙",
      "💛",
      "💚",
      "🧡",
      "🖤",
      "💖",
      "❤️",
      "👍",
      "⭐",
      "🎉",
      "🥳",
      "👏",
    ];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    heart.textContent = randomEmoji;
    heart.style.position = "fixed";
    heart.style.fontSize = "100px";
    heart.style.opacity = "1";
    heart.style.transition = `opacity ${0.5 + Math.random()}s ease-out`;
    heart.style.zIndex = "1000";

    const randomX = Math.random() * window.innerWidth;
    const randomY = Math.random() * window.innerHeight;
    heart.style.left = `${randomX}px`;
    heart.style.top = `${randomY}px`;

    const randomRotation = Math.random() * 60 - 30;
    heart.style.transform = `translate(-50%, -50%) rotate(${randomRotation}deg)`;

    document.body.appendChild(heart);

    setTimeout(() => {
      heart.style.opacity = "0";
    }, 100 + Math.random() * 500);

    setTimeout(() => {
      if (heart.parentElement) {
        document.body.removeChild(heart);
      }
    }, 1600 + Math.random() * 1000);
  }
}

// Modal Functions

function openHelpPopup() {
  document.getElementById("helpPopup").style.display = "block";
}

function closeHelpPopup() {
  document.getElementById("helpPopup").style.display = "none";
}

function showConfirmationModal(onConfirm, ...args) {
  const modal = document.getElementById("confirmationModal");
  const confirmButton = document.getElementById("confirmButton");
  const cancelButton = document.getElementById("cancelButton");

  modal.style.display = "flex";

  confirmButton.onclick = function () {
    modal.style.display = "none";
    onConfirm(...args);
  };

  cancelButton.onclick = function () {
    modal.style.display = "none";
  };
}

function showAvatarSettingsModal(index) {
  const student = students[index];
  const modal = document.getElementById("avatarSettingsModal");
  const confirmButton = document.getElementById("avatarConfirmButton");
  const nextButton = document.getElementById("avatarNextButton");
  const randomButton = document.getElementById("avatarRandomButton");
  const resetButton = document.getElementById("avatarResetButton");

  saveState();

  modal.style.display = "flex";

  document.getElementById("skinColor").value = student.color;
  document.getElementById("faceShape").value = student.shape;
  document.getElementById("eyeShape").value = student.eye;
  document.getElementById("mouthShape").value = student.mouth;
  document.getElementById("sunglasses").value = student.glass;

  const container = document.querySelector("#avatarModalAvatarContainer");
  container.innerHTML = `<div class="avatar-large">${generateAvatar(index)}</div>`;

  modalEventListeners.forEach((listener) => {
    listener.element.removeEventListener(listener.event, listener.handler);
  });
  modalEventListeners = [];

  document.querySelectorAll(".avatar-select").forEach((select) => {
    const listener = function () {
      student.color = parseInt(document.getElementById("skinColor").value);
      student.shape = parseInt(document.getElementById("faceShape").value);
      student.eye = parseInt(document.getElementById("eyeShape").value);
      student.mouth = parseInt(document.getElementById("mouthShape").value);
      student.glass = parseInt(document.getElementById("sunglasses").value);
      students[index] = student;
      container.innerHTML = `<div class="avatar-large">${generateAvatar(
        index
      )}</div>`;
    };

    select.addEventListener("change", listener);

    modalEventListeners.push({
      element: select,
      event: "change",
      handler: listener,
    });
  });

  confirmButton.onclick = function () {
    modal.style.display = "none";
    saveAndRender();
  };

  nextButton.onclick = function () {
    nextStyle(index);
  };

  randomButton.onclick = function () {
    slotMachineEffect(index);
  };

  resetButton.onclick = function () {
    resetAvatar(index);
  };
}

function resetAvatar(index) {
  const student = students[index];
  const hash = stringToHash(student.name);
  student.color = hash % colors.length;
  student.shape = (hash % 100) % 7;
  student.eye = Math.floor((hash / 100) % 100) % 4;
  student.glass = 0;
  student.mouth = 0;

  document.getElementById("skinColor").value = student.color;
  document.getElementById("faceShape").value = student.shape;
  document.getElementById("eyeShape").value = student.eye;
  document.getElementById("mouthShape").value = student.mouth;
  document.getElementById("sunglasses").value = student.glass;

  students[index] = student;

  console.log(student);

  const container = document.querySelector("#avatarModalAvatarContainer");
  container.innerHTML = `<div class="avatar-large">${generateAvatar(index)}</div>`;
}

function nextStyle(index) {
  const student = students[index];
  
  let shapeIndex = student.shape;
  let eyeIndex = student.eye;
  let mouthIndex = student.mouth;
  let glassIndex = student.glass;

  // Increment in the correct order
  if (shapeIndex < shapes.length - 1) {
    shapeIndex++;
  } else {
    shapeIndex = 0;
    if (eyeIndex < eyes.length - 1) {
      eyeIndex++;
    } else {
      eyeIndex = 0;
      if (mouthIndex < mouths.length - 1) {
        mouthIndex++;
      } else {
        mouthIndex = 0;
        if (glassIndex < glasses.length - 1) {
          glassIndex++;
        } else {
          glassIndex = 0;
        }
      }
    }
  }

  student.shape = shapeIndex;
  student.eye = eyeIndex;
  student.mouth = mouthIndex;
  student.glass = glassIndex;

  document.getElementById("faceShape").value = student.shape;
  document.getElementById("eyeShape").value = student.eye;
  document.getElementById("mouthShape").value = student.mouth;
  document.getElementById("sunglasses").value = student.glass;

  students[index] = student;

  const container = document.querySelector("#avatarModalAvatarContainer");
  container.innerHTML = `<div class="avatar-large">${generateAvatar(index)}</div>`;
}

function randomizeAvatar(index) {
  const student = students[index];

  student.color = Math.floor(Math.random() * colors.length);
  student.shape = Math.floor(Math.random() * shapes.length);
  student.eye = Math.floor(Math.random() * (eyes.length + glasses.length));
  
  if (student.eye >= eyes.length) {
    student.glass = student.eye - eyes.length;
    student.eye = 0; // No eye type if wearing glasses
  } else {
    student.glass = 0; // No glasses if an eye type is selected
  }

  student.mouth = Math.floor(Math.random() * mouths.length);

  document.getElementById("skinColor").value = student.color;
  document.getElementById("faceShape").value = student.shape;
  document.getElementById("eyeShape").value = student.eye;
  document.getElementById("mouthShape").value = student.mouth;
  document.getElementById("sunglasses").value = student.glass;

  students[index] = student;

  // Render the updated avatar
  const container = document.querySelector("#avatarModalAvatarContainer");
  container.innerHTML = `<div class="avatar-large">${generateAvatar(index)}</div>`;
}

function slotMachineEffect(index, iterations = 10, initialDelay = 50, maxDelay = 300) {
  let delay = initialDelay;
  for (let i = 0; i < iterations; i++) {
    setTimeout(() => {
      randomizeAvatar(index);
    }, delay);
    delay += (maxDelay - initialDelay) / iterations; // Ease-out delay increase
  }
}

// Class photo mode

function toggleClassPhotoMode() {
  const elementsToHide = document.querySelectorAll(
    ".class-card, .new-student-card, .points, .pointsManage, #manageControls, .delete, .avatarSettings"
  );
  const classPhotoButton = document.getElementById("classPhotoRestoreButton");
  const studentCards = document.querySelectorAll(".student-card");
  const avatars = document.querySelectorAll(".avatar");

  const isPhotoMode = elementsToHide[0]?.style.display !== "none"; // Check if currently visible

  elementsToHide.forEach((element) => {
    element.style.display = isPhotoMode ? "none" : "";
  });

  // Show restore button only when in photo mode
  classPhotoButton.style.display = isPhotoMode ? "block" : "none";

  studentCards.forEach((card) => {
    card.classList.toggle("photo-mode", isPhotoMode);
  });

  avatars.forEach((avatar) => {
    avatar.classList.toggle("avatar-large", isPhotoMode); // Add "avatar-large" class when not in photo mode
  });
}


// Helper Functions

function stringToHash(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return h * 360;
}

function enableDragAndDrop() {
  const studentCards = document.querySelectorAll(".student-card");
  studentCards.forEach((card, index) => {
    card.draggable = true;

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index);
      card.classList.add("dragging");
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      selectedStudents.clear();
      e.preventDefault();
      const oldIndex = e.dataTransfer.getData("text/plain");
      const newIndex = Array.from(studentCards).indexOf(
        e.target.closest(".student-card")
      );
      const movedItem = students.splice(oldIndex, 1)[0];
      students.splice(newIndex, 0, movedItem);

      saveAndRender();
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document
        .querySelectorAll(".drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
    });
  });
}

// Startup functions (usually only called once)

function loadSVGTemplates() {
  shapes = Array.from(document.querySelectorAll('template[id^="shape-"]')).map(
    (template) => template
  );
  eyes = Array.from(document.querySelectorAll('template[id^="eyes-"]')).map(
    (template) => template.innerHTML
  );
  mouths = Array.from(document.querySelectorAll('template[id^="mouth-"]')).map(
    (template) => template.innerHTML
  );
  glasses = Array.from(
    document.querySelectorAll('template[id^="glasses-"]')
  ).map((template) => template.innerHTML);
}

function renderSkinColorSelect() {
  const skinColorSelect = document.getElementById("skinColor");
  colors.forEach((color, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.style.backgroundColor = color[1];
    option.textContent = color[0];
    skinColorSelect.appendChild(option);
  });
}

function sortColors() {
  colors.sort((a, b) => hexToHsl(a[1]) - hexToHsl(b[1]));
}

function onLoad() {
  loadSVGTemplates();
  sortColors();
  renderSkinColorSelect();
  saveAndRender();
}