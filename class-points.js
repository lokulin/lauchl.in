const Observable = (Base) =>
  class extends Base {
    constructor(...args) {
      super(...args);
      this.subscribers = new Set();
    }

    subscribe(callback) {
      this.subscribers.add(callback);
    }

    unsubscribe(callback) {
      this.subscribers.delete(callback);
    }

    notify(data) {
      this.subscribers.forEach((callback) => callback(data));
    }
  };

class User extends Observable(Object) {
  _code;

  constructor(code) {
    super();
    this._code = code;
    this.notify(this);
  }

  set code(code) {
    if (this._code !== code) {
      this._code = code;
      this.notify(this);
    }
  }

  get code() {
    return this._code;
  }

  toJSON() {
    return { code: this._code };
  }
}

class Entity extends Observable(Object) {
  _name;
  _points;
  _id;
  _lastUpdated;

  constructor(name, points = 0, id, lastUpdated) {
    super();
    this._name = name.trim().replace(/['"\\;=%<>()\[\]{},]/g, '');
    this._id = id || this.generateUniqueID();
    this._points = points;
    this._lastUpdated = lastUpdated || Date.now();
  }

  toJSON() {
    return {
      name: this._name,
      points: this._points,
      id: this._id,
      lastUpdated: this._lastUpdated,
      avatar: this._avatar,
      role: this.constructor.name,
    };
  }

  static fromJSON(json) {
    if (json.role === "Teacher" || json.isTeacher === true) {
      return new Teacher(json.name, parseInt(json.points), json.id, json.lastUpdated, Avatar.fromJSON(json));
    } else {
      return new Student(json.name, parseInt(json.points), json.id, json.lastUpdated, Avatar.fromJSON(json));
    }
  }

  setPoints(value) {
    if (value < 0 || value[0] === "+") this._points += parseInt(value);
    else this._points = parseInt(value);
    if (this._points < 0) this._points = 0;
    this.notify(this);
  }

  generateUniqueID() {
    return hashString(this._name);
  }

  shortName() {
    const nameParts = this._name.split(" ");
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? " " + nameParts[1][0] + "." : "";
    return `${firstName}${lastInitial}`;
  }

  updateFrom(other) {
    if (other.lastUpdated > this._lastUpdated) {
      this._name = other.name;
      this._points = other.points;
      this._id = other.id;
      this._lastUpdated = other.lastUpdated;
      this._avatar = other.avatar;
      this.notify(this);
    }
  }

  static toggleTypeOf(entity) {
    return entity.constructor.name === "Teacher" ? entity.toStudent() : entity.toTeacher();
  }

  get name() {
    return this._name;
  }

  set name(value) {
    this._updateAt();
    this._name = value;
    this.notify(this);
  }

  get points() {
    return this._points;
  }

  set points(value) {
    this._updateAt();
    this._points = value;
    this.notify(this);
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._updateAt();
    this._id = value;
    this.notify(this);
  }

  get lastUpdated() {
    return this._lastUpdated;
  }

  set lastUpdated(value) {
    this._lastUpdated = value;
  }

  isTeacher() {
    return this.constructor.name === "Teacher";
  }

  _updateAt() {
    this._lastUpdated = Date.now();
  }
}

const EntityWithAvatar = (Base) =>
  class extends Base {
    _avatar;

    constructor(name, points, id, lastUpdated, avatar) {
      super(name, points, id, lastUpdated);
      this._avatar = !avatar ? Avatar.random() : Avatar.fromAvatar(avatar);
    }

    get avatar() {
      return this._avatar;
    }

    set avatar(value) {
      this._updateAt();
      this._avatar = value;
      this.notify(this);
    }
  };

class Class extends Entity {
  constructor(name, points = 0, id, lastUpdated) {
    super(name, points, id, lastUpdated);
  }

  updateFrom(other, forced = false) {
    if (forced || other.lastUpdated >= this._lastUpdated) {
      this._name = other.name;
      this._points = other.points;
      this._id = other.id;
      this._lastUpdated = forced ? Date.now() : other.lastUpdated;
      this.notify(this);
    }
  }
}

class Student extends EntityWithAvatar(Entity) {
  constructor(name, points, id, lastUpdated, avatar) {
    super(name, points, id, lastUpdated, avatar);
  }
  toTeacher() {
    return new Teacher(this._name, this._points, this._id, this._lastUpdated, this._avatar);
  }
}

class Teacher extends EntityWithAvatar(Entity) {
  constructor(name, points, id, lastUpdated, avatar) {
    super(name, points, id, lastUpdated, avatar);
  }
  toStudent() {
    return new Student(this._name, this._points, this._id, this._lastUpdated, this._avatar);
  }
}

class Entities extends Observable(Object) {
  _entities;

  constructor(entities = new Map()) {
    super();
    this._entities = entities;
    this.forEach = this._entities.forEach.bind(this._entities);
    this.entries = this._entities.entries.bind(this._entities);
    this.keys = this._entities.keys.bind(this._entities);
    this.values = this._entities.values.bind(this._entities);
    this.get = this._entities.get.bind(this._entities);
    this.has = this._entities.has.bind(this._entities);
  }

  [Symbol.iterator]() {
    return this._entities.values();
  }

  set(key, value) {
    this._entities.set(key, value);
    this.notify(this);
  }

  remove(key) {
    this._entities.delete(key);
    this.notify(this);
  }

  empty() {
    this._entities.clear();
    this.notify(this);
  }

  toggleTypeOf(entity) {
    entity = Entity.toggleTypeOf(entity);
    this._entities.set(entity.id, entity);
    return entity;
  }
}

class Students extends Entities {
  #deletedStudents;

  constructor(entities = new Map(), deletedStudents = new Set()) {
    super(entities);
    this.#deletedStudents = deletedStudents;
  }

  updateFrom(others) {
    this.#deletedStudents.forEach((key) => {
      this.delete(key);
    });

    others.forEach((other, key) => {
      if (this.#deletedStudents.has(key)) return;

      if (this.has(key)) {
        this.get(key).updateFrom(other);
      } else {
        this.set(key, other);
      }
    });
  }

  static fromArray(array) {
    if (!array) return array;
    const entities = new Map(array);
    entities.forEach((s) => {
      entities.set(s.id, new Student(s.name, s.points, s.id, s.avatar));
    });
    return new Students(entities);
  }

  toJSON() {
    const json = [];
    for (const entity of this._entities.values()) {
      json.push(entity.toJSON());
    }
    return json;
  }

  static fromJSON(json) {
    if (!json) return json;
    const students = new Map(json.map((s) => [s.id, Entity.fromJSON(s)]));
    return new Students(students);
  }

  static fromDefault() {
    const students = new Map();
    Config.DEFAULT_STUDENTS.forEach((s) => {
      const student = new Student(s.name);
      students.set(student.id, student);
    });
    return new Students(students);
  }

  clear() {
    this.mergeDeletedStudents(Array.from(this._entities.keys()));
    this._entities.clear();
    this.notify(this);
  }

  delete(key) {
    if (this._entities.has(key)) {
      this.#deletedStudents.add(key);
      this._entities.delete(key);
      this.notify(this);
    }
  }

  set deletedStudents(value) {
    this.#deletedStudents = value;
  }

  get deletedStudents() {
    return this.#deletedStudents;
  }

  mergeDeletedStudents(other) {
    this.#deletedStudents = new Set([...this.#deletedStudents, ...other]);
  }
}

class Group {
  constructor(id, members) {
    this.id = id;
    this.members = new Set([...members]);
  }

  toJSON() {
    return Array.from(this.members);
  }
}

class Groups extends Entities {
  _studentIDs;

  constructor(members, groupSize = 2, groups) {
    super();
    this._studentIDs = [...members].filter((member) => !member.isTeacher()).map((member) => member.id);
    this.groupSize = groupSize;
    if (groups) {
      groups.map((g) => {
        const id = hashString(g.toString());
        this._entities.set(id, new Group(id, g));
      });
    } else this.randomize();
    members.subscribe(App.updateGroups);
  }

  toJSON() {
    const json = [];
    for (const group of this._entities.values()) {
      json.push(group.toJSON());
    }
    return json;
  }

  shuffleStudents() {
    for (let i = this._studentIDs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._studentIDs[i], this._studentIDs[j]] = [this._studentIDs[j], this._studentIDs[i]];
    }
  }

  randomize() {
    this.shuffleStudents();
    this._entities.clear();
    for (let i = 0; i < this._studentIDs.length; i += this.groupSize) {
      const group = this._studentIDs.slice(i, i + this.groupSize).map((id) => id);
      const key = hashString(group.toString);
      this._entities.set(key, new Group(key, group));
    }
    this.notify(this);
  }

  clear() {
    this._entities.clear();
    this.notify(this);
  }

  delete(key) {
    this._entities.delete(key);
    this.notify(this);
  }

  set studentIDs(ids) {
    this._studentIDs = ids;
    this.notify(this);
  }

  get studentIDs() {
    return this._studentIDs;
  }
}

class Avatar extends Observable(Object) {
  constructor(color = 0, shape = 0, eyeShape = 0, mouthShape = 0, glassesShape = 0) {
    super();
    this.color = parseInt(color);
    this.shape = parseInt(shape);
    this.eyeShape = parseInt(eyeShape);
    this.mouthShape = parseInt(mouthShape);
    this.glassesShape = parseInt(glassesShape);
    this.svg = AvatarBuilder.build(this);
  }

  static random(basic = true) {
    const color = ColorStore.randomColor();
    const shapes = ShapeStore.randomShapes(basic);
    return new Avatar(color, ...shapes);
  }

  static toJSON() {
    return {
      color: this.color,
      shape: this.shape,
      eye: this.eyeShape,
      mouth: this.mouthShape,
      glass: this.glassesShape,
    };
  }

  static fromJSON(json) {
    if (json.avatar) {
      return Avatar.fromAvatar(json.avatar);
    } else {
      return new Avatar(parseInt(json.color), parseInt(json.shape), parseInt(json.eye), parseInt(json.mouth), parseInt(json.glass));
    }
  }

  clone() {
    return new Avatar(this.color, this.shape, this.eyeShape, this.mouthShape, this.glassesShape);
  }

  static fromAvatar(other) {
    return new Avatar(other.color, other.shape, other.eyeShape, other.mouthShape, other.glassesShape);
  }
}

class ClassAvatar {
  constructor() {
    this.svg = new ClassAvatarBuilder.build();
  }

  static getAvatars() {
    const avatars = [];
    const numberOfAvatars = 9;

    for (let i = 0; i < numberOfAvatars; i++) {
      const color = (i * 4) % ColorStore.size;
      const shape = i % 7;
      const eye = i % 4;
      const mouth = i % 4;
      avatars.push(new Avatar(color, shape, eye, mouth));
    }
    return avatars;
  }
}

class ShapeStore {
  static #initialized = false;
  static #shapes;
  static #eyeShapes;
  static #mouthShapes;
  static #glassesShapes;

  static #fromTemplates(className) {
    const shapes = [];
    const templates = document.getElementsByClassName(className);
    for (const template of templates) {
      shapes[template.dataset.shapeId] = {
        id: template.dataset.shapeId,
        name: template.dataset.shapeName,
        template: template.content.querySelector("g").cloneNode(true),
      };
    }
    return shapes;
  }

  static init() {
    if (!ShapeStore.#initialized) {
      ShapeStore.#initialized = true;
      ShapeStore.#shapes = ShapeStore.#fromTemplates("shape");
      ShapeStore.#eyeShapes = ShapeStore.#fromTemplates("eyes");
      ShapeStore.#mouthShapes = ShapeStore.#fromTemplates("mouth");
      ShapeStore.#glassesShapes = ShapeStore.#fromTemplates("glasses");
    }
  }

  static randomShapes(basic = false) {
    ShapeStore.init();

    const randomIndex = (limit) => {
      return Math.floor(Math.random() * limit);
    };

    const shape = randomIndex(basic ? 7 : ShapeStore.#shapes.length);
    let eye = randomIndex(basic ? 4 : (ShapeStore.#eyeShapes.length + ShapeStore.#glassesShapes.length));
    let glasses = 0;
    const mouth = randomIndex(basic ? 0 : ShapeStore.#mouthShapes.length);

    if (eye >= ShapeStore.#eyeShapes.length) {
      glasses = eye - ShapeStore.#eyeShapes.length;
      eye = 0;
    }

    return [shape, eye, mouth, glasses];
  }

  static getShape(type, id) {
    const shape = ShapeStore[type][id];

    if (!shape) throw new Error(`Invalid ${type} ID: ${id}`);
    return shape.template.cloneNode(true);
  }

  static shape(id) {
    return ShapeStore.getShape("shapes", id);
  }

  static eyes(id) {
    return ShapeStore.getShape("eyeShapes", id);
  }

  static mouth(id) {
    return ShapeStore.getShape("mouthShapes", id);
  }

  static glasses(id) {
    return ShapeStore.getShape("glassesShapes", id);
  }

  static get shapes() {
    ShapeStore.init();
    return ShapeStore.#shapes;
  }

  static get eyeShapes() {
    ShapeStore.init();
    return ShapeStore.#eyeShapes;
  }

  static get mouthShapes() {
    ShapeStore.init();
    return ShapeStore.#mouthShapes;
  }

  static get glassesShapes() {
    ShapeStore.init();
    return ShapeStore.#glassesShapes;
  }
}

class ColorStore {
  static #colors;

  static #hexToHsl(hex) {
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

  static init() {
    if (!ColorStore.#colors) {
      ColorStore.#colors = [
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
      ColorStore.#colors.sort((a, b) => ColorStore.#hexToHsl(a[1]) - ColorStore.#hexToHsl(b[1]));
    }
  }

  static get colors() {
    ColorStore.init();
    return ColorStore.#colors;
  }

  static getColor(index) {
    ColorStore.init();
    return ColorStore.#colors[index][1];
  }

  static randomColor() {
    ColorStore.init();
    return Math.floor(Math.random() * ColorStore.size);
  }

  static get size() {
    ColorStore.init();
    return ColorStore.#colors.length;
  }
}

class View {
  static show() {
    View.current.show();
  }

  static get current() {
    return Config.routes[window.location.pathname] || FourOhFourView;
  }

  static closeModal() {
    window.location.hash = '#';
    window.history.replaceState({}, '', `/`);
  }

  static closeButton() {
    const closeButton = document.createElement("div");
    closeButton.className = "close-button";
    closeButton.innerHTML = "X";
    closeButton.onclick = () => ClassPhotoView.close();
    return closeButton;
  }
}

class ClassView extends View {
  static containerId = "studentsContainer";
  static container;
  static classCard;
  static newStudentCard;
  static dummyCard;
  static sortOrder = "asc";
  static sortBy = "name";
  static rendered = false;

  static render() {
    if (ClassView.rendered) return;
    ClassView.container = document.getElementById(ClassView.containerId);
    ClassView.container.replaceChildren();

    ClassView.classCard = ClassCard.present(App.class);
    ClassView.newStudentCard = NewStudentCard.present();
    ClassView.dummyCard = CardFactory.present(new Student("Dummy"));
    ClassView.dummyCard.classList.add("dummy");
    ClassView.dummyCard.style.display = "none";

    App.students.subscribe(ClassView.update);

    document.addEventListener("scroll", TaskBar.updateTaskbarVisibility);
    window.addEventListener("resize", TaskBar.updateTaskbarVisibility);

    ClassView.container.appendChild(ClassView.classCard);
    App.students.forEach((student) => ClassView.container.appendChild(CardFactory.present(student)));
    ClassView.container.appendChild(ClassView.newStudentCard);

    ClassView.orderCardsBy(ClassView.sortBy, ClassView.sortOrder);

    ClassView.container.appendChild(ClassView.dummyCard);

    TaskBar.updateTaskbarVisibility();
    ClassView.rendered = true;
  }

  static show() {
    ClassView.render();
    ClassView.container.style.display = "flex";
    TaskBar.show();
  }

  static hide() {
    ClassView.container.style.display = "none";
    TaskBar.hide();
  }

  static update(students) {
    const existingCards = Array.from(ClassView.container.querySelectorAll(".student-card:not(.dummy)"));

    existingCards.forEach((card) => {
      if (!students.has(card.dataset.id)) {
        ClassView.container.removeChild(card);
      }
    });

    students.forEach((student) => {
      if (![...existingCards].some((card) => card.dataset.id == student.id)) {
        ClassView.container.insertBefore(CardFactory.present(student), ClassView.newStudentCard);
      }
    });
  }

  static handleDragOver(event) {
    event.preventDefault();
    const targetCard = event.target.closest(".student-card");

    if (!targetCard || targetCard === StudentCard.draggedCard) {
      return; // Ignore if no valid target or if hovering over itself
    }

    ClassView.dummyCard.style.display = "flex";

    const cardRect = targetCard.getBoundingClientRect();
    const mouseX = event.clientX;
    const cardMidX = cardRect.left + cardRect.width / 2;

    if (mouseX < cardMidX) {
      ClassView.container.insertBefore(ClassView.dummyCard, targetCard);
    } else {
      ClassView.container.insertBefore(ClassView.dummyCard, targetCard.nextSibling);
    }
  }

  static handleDragStart(event) {
    const dragImage = event.target.cloneNode(true);
    StudentCard.draggedCard = event.target;
    ClassView.container.insertBefore(ClassView.dummyCard, StudentCard.draggedCard);

    const isFirefox = /Firefox/i.test(navigator.userAgent);

    if (isFirefox) {
      ClassView.dummyCard.style.display = "flex";
      StudentCard.draggedCard.style.display = "none";

      dragImage.style.position = "absolute";
      dragImage.style.top = "-9999px"; // Move it offscreen
      document.body.appendChild(dragImage);

      event.dataTransfer.setDragImage(dragImage, 150, 50);

      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  }

  static handleDragEnd(event) {
    event.preventDefault();
    StudentCard.draggedCard.style.display = "flex";
    ClassView.dummyCard.style.display = "none";
  }

  static handleDroppedCard(event) {
    event.preventDefault();
    const card = event.target.closest(".student-card");
    ClassView.container.insertBefore(StudentCard.draggedCard, card);
    StudentCard.draggedCard.style.display = "flex";
    ClassView.dummyCard.style.display = "none";
  }

  static toggleSelected() {
    const cards = document.querySelectorAll(".student-card:not(.dummy)");
    const selectedCards = document.querySelectorAll(".student-card.selected");

    if (selectedCards.length > 0 && selectedCards.length < cards.length)
      selectedCards.forEach((card) => card.classList.remove("selected"));
    else cards.forEach((card) => card.classList.toggle("selected"));
  }

  static #orderCards(cards, sortBy, order) {
    const by = cards.map((card) => {
      const value = card.querySelector(`.${sortBy}`).textContent.trim();
      return {
        card: card,
        sortBy: isNaN(value) ? value : parseFloat(value),
      };
    });

    by.sort((a, b) => {
      if (typeof a.sortBy === "number" && typeof b.sortBy === "number") {
        return order === "asc" ? a.sortBy - b.sortBy : b.sortBy - a.sortBy;
      } else {
        return order === "asc"
          ? a.sortBy.localeCompare(b.sortBy, undefined, { numeric: true })
          : b.sortBy.localeCompare(a.sortBy, undefined, { numeric: true });
      }
    });

    return by;
  }

  static orderCardsBy(sortBy = "name", order = "asc") {
    ClassView.sortBy = sortBy;
    ClassView.sortOrder = order;

    const studentCards = Array.from(document.querySelectorAll(".student-card:not(.teacher-card)"));
    const teacherCards = Array.from(document.querySelectorAll(".teacher-card"));

    const studentCardsBy = ClassView.#orderCards(studentCards, sortBy, order);
    const teacherCardsBy = ClassView.#orderCards(teacherCards, sortBy, order);

    studentCardsBy.forEach((item) => {
      ClassView.container.appendChild(item.card);
    });
    teacherCardsBy.forEach((item) => {
      ClassView.container.appendChild(item.card);
    });
    ClassView.container.appendChild(ClassView.newStudentCard);
    ClassView.container.appendChild(ClassView.dummyCard);
  }
}

class GroupView {
  static containerId = "groupsContainer";
  static container;
  static view;
  static groups;
  static dummyGroup;

  static render() {
    GroupView.view = document.getElementById("groupsView");
    GroupView.container = document.getElementById(GroupView.containerId);
    GroupView.container.replaceChildren();

    GroupView.groups.forEach((group) => {
      const card = CardFactory.present(group);
      App.addEventListener(card, "", "dragover", GroupView.handleDragOver);
      GroupView.container.appendChild(card);
    });

    GroupView.addDummyGroup();
    GroupView.dummyGroup.style.display = "none";
  }

  static show(by = 2) {
    GroupView.groups = by === 2 ? App.groupsBy2 : App.groupsBy3;
    GroupView.render();
    window.history.replaceState({}, "", `/groupBy${by}`);
    GroupView.view.style.display = "flex";
  }

  static close() {
    GroupView.view.style.display = "none";
    window.history.replaceState({}, "", `/`);
    ClassView.show();
  }

  static addDummyGroup() {
    GroupView.dummyGroup = CardFactory.present(new Group(hashString(Date.now()), []));
    GroupView.dummyGroup.classList.add("dummy-group");
    GroupView.container.appendChild(GroupView.dummyGroup);
    App.addEventListener(GroupView.dummyGroup, "", "dragover", GroupView.handleDragOver);
  }

  static randomize() {
    GroupView.groups.randomize();
    GroupView.render();
  }

  static handleDragOver(event) {
    event.preventDefault();
    const targetContainer = event.target.closest(".group-card");

    if (!targetContainer) return;

    targetContainer.appendChild(GroupMemberCard.draggedCard);
  }

  static handleDragStart(event) {
    GroupMemberCard.draggedCard = event.target;
    GroupMemberCard.sourceContainer = GroupMemberCard.draggedCard.closest(".group-card");
    GroupView.dummyGroup.style.display = "flex";
  }

  static handleDragEnd(event) {
    event.preventDefault();
    const targetContainer = GroupMemberCard.draggedCard.closest(".group-card");
    if (targetContainer.classList.contains("dummy-group")) {
      targetContainer.classList.remove("dummy-group");
      GroupView.addDummyGroup();
      GroupView.groups.set(targetContainer.dataset.id, new Group(targetContainer.dataset.id, []));
    }
    GroupView.dummyGroup.style.display = "none";

    GroupView.groups.studentIDs = [...GroupView.container.childNodes]
      .flatMap((node) => [...node.childNodes])
      .filter((n) => n.dataset.id)
      .map((n) => n.dataset.id);

    GroupView.groups
      .get(GroupMemberCard.sourceContainer.dataset.id)
      .members.delete(GroupMemberCard.draggedCard.dataset.id);
    GroupView.groups.get(targetContainer.dataset.id).members.add(GroupMemberCard.draggedCard.dataset.id);

    if (GroupView.groups.get(GroupMemberCard.sourceContainer.dataset.id).members.size === 0)
      GroupView.groups.delete(GroupMemberCard.sourceContainer.dataset.id);
    if (!GroupMemberCard.sourceContainer.firstChild) GroupMemberCard.sourceContainer.remove();

    // TODO Fix calling persist from GroupView
    StateManager.persist();
  }
}

class ClassPhotoView {
  static show() {
    const container = document.getElementById("classPhotoView")
    container.style.display = "flex";
    document.getElementById("classPhotoView").replaceChildren();

    App.students.forEach((student) => container.appendChild(GroupMemberCard.present(student.id)));

    //TODO fix sort order ClassView.orderCardsBy(ClassView.sortBy, ClassView.sortOrder);

    container.appendChild(View.closeButton());
    
    View.current.hide();
    window.history.replaceState({}, '', `/classPhoto`);
    TaskBar.hide();
  }

  static hide() {}

  static close() {
    document.getElementById("classPhotoView").style.display = "none";
    View.closeModal();
    View.show();
  }

}

class AllAvatarsView extends View {
  static container;

  static show() {
    const container = document.createElement("div");
    container.id = "avatarsContainer";
    const numEyeOpts = ShapeStore.eyeShapes.length + ShapeStore.glassesShapes.length;

    const closeButton = document.createElement("div");
    closeButton.className = "close-button";
    closeButton.innerHTML = "X";
    closeButton.onclick = () => AllAvatarsView.close();

    container.appendChild(closeButton);

    let avatars = [];
    let c = 0;
    for (let s = 0; s < ShapeStore.shapes.length; s++) {
      for (let eo = 0; eo < numEyeOpts - 1; eo++) {
        let e = eo < ShapeStore.eyeShapes.length ? eo : 0;
        let g = eo >= ShapeStore.eyeShapes.length ? eo - ShapeStore.eyeShapes.length + 1 : 0;
        for (let m = 0; m < ShapeStore.mouthShapes.length; m++) {
          const avatar = new Avatar(c % ColorStore.size, s, e, m, g);
          const avatarDiv = document.createElement("div");
          avatarDiv.id = "avatar";
          avatarDiv.className = "avatar";
          avatarDiv.innerHTML = AvatarBuilder.build(avatar).outerHTML;
          avatars.push(avatarDiv);
          c++;
        }
      }
    }

    for (let i = avatars.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [avatars[i], avatars[j]] = [avatars[j], avatars[i]];
    }

    avatars.forEach((avatar) => container.appendChild(avatar));
    TaskBar.hide();
    document.body.appendChild(container);
    setTimeout(AllAvatarsView.randomSwap, 500);
  }

  static close() {
    document.getElementById("avatarsContainer").remove();
    View.closeModal();
    View.show();
  }

  static randomSwap() {
    const container = document.getElementById("avatarsContainer");
    const avatars = Array.from(container.querySelectorAll(".avatar"));

    if (avatars.length > 1) {
      let index1 = Math.floor(Math.random() * avatars.length);
      let index2;
      do {
        index2 = Math.floor(Math.random() * avatars.length);
      } while (index1 === index2);

      const avatar1 = avatars[index1];
      const avatar2 = avatars[index2];

      const sibling = avatar2.nextSibling;
      container.insertBefore(avatar2, avatar1);
      if (sibling) {
        container.insertBefore(avatar1, sibling);
      } else {
        container.appendChild(avatar1);
      }
    }
    setTimeout(AllAvatarsView.randomSwap, 500);
  }
}

class RandomAvatarView extends View {
  static show() {
    const container = document.createElement("div");
    container.id = "randomAvatarContainer";

    RandomAvatarView.avatarDiv = document.createElement("div");
    RandomAvatarView.avatarDiv.id = "avatar";
    RandomAvatarView.avatarDiv.className = "avatar";

    const closeButton = document.createElement("div");
    closeButton.className = "close-button";
    closeButton.innerHTML = "X";
    closeButton.onclick = () => RandomAvatarView.close();

    container.appendChild(RandomAvatarView.avatarDiv);
    container.appendChild(closeButton);

    TaskBar.hide();
    document.body.appendChild(container);
    setTimeout(RandomAvatarView.randomizeAvatar, 250);
  }

  static close() {
    document.getElementById("randomAvatarContainer").remove();
    View.closeModal();
    View.show();
  }

  static randomizeAvatar() {
    const avatar = Avatar.random(false);
    RandomAvatarView.avatarDiv.innerHTML = AvatarBuilder.build(avatar).outerHTML;
    setTimeout(RandomAvatarView.randomizeAvatar, 250);
  }
}

class FourOhFourView {}

class EditAvatarModal {
  static #isInitialized = false;
  static #modal;
  static #card;
  static #avatarContainer;
  static #member;
  static #tempAvatar;

  static init() {
    if (EditAvatarModal.#isInitialized) return;
    EditAvatarModal.#modal = document.getElementById("avatarSettingsModal");

    const skinColorSelect = document.getElementById("skinColor");

    ColorStore.colors.forEach((color, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.style.backgroundColor = color[1];
      option.textContent = color[0];
      skinColorSelect.appendChild(option);
    });

    ["shapes", "eyeShapes", "mouthShapes", "glassesShapes"].forEach((shapeType) => {
      const shapeSelect = document.getElementById(shapeType);
      ShapeStore[shapeType].forEach((shape, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = shape.name;
        shapeSelect.appendChild(option);
      });
    });

    App.addEventListener(EditAvatarModal.#modal, ".avatar-select", "change", EditAvatarModal.changeAvatar);

    EditAvatarModal.#isInitialized = true;
  }

  static show(event, member) {
    if (!EditAvatarModal.#isInitialized) EditAvatarModal.init();
    const avatar = member.avatar;

    EditAvatarModal.#modal.style.display = "flex";
    EditAvatarModal.#member = member;
    EditAvatarModal.#tempAvatar = member.avatar.clone();
    EditAvatarModal.#card = event.target.closest(".card");

    EditAvatarModal.updateSelections(EditAvatarModal.#tempAvatar);

    document.getElementById("isTeacher").checked = member.constructor.name === "Teacher";

    EditAvatarModal.#avatarContainer = document.querySelector("#avatarContainer");
    EditAvatarModal.#avatarContainer.innerHTML = AvatarBuilder.build(EditAvatarModal.#tempAvatar).outerHTML;
  }

  static toggleTeacher(event) {
    const member = EditAvatarModal.#member;
    EditAvatarModal.#member = App.students.toggleTypeOf(member);
    EditAvatarModal.#card.remove();
    EditAvatarModal.#card = CardFactory.present(EditAvatarModal.#member);
    ClassView.container.appendChild(EditAvatarModal.#card);

    View.current.orderCardsBy(ClassView.sortBy, ClassView.sortOrder);
  }

  static updateSelections() {
    const avatar = EditAvatarModal.#tempAvatar;
    document.getElementById("skinColor").value = avatar.color;
    document.getElementById("shapes").value = avatar.shape;
    document.getElementById("eyeShapes").value = avatar.eyeShape;
    document.getElementById("mouthShapes").value = avatar.mouthShape;
    document.getElementById("glassesShapes").value = avatar.glassesShape;
  }

  static updateAvatar() {
    const avatar = EditAvatarModal.#tempAvatar;
    EditAvatarModal.#avatarContainer.innerHTML = AvatarBuilder.build(avatar).outerHTML;
    EditAvatarModal.#card.querySelector(".avatar").innerHTML = AvatarBuilder.build(avatar).outerHTML;
  }

  static resetAvatar(event) {
    EditAvatarModal.#tempAvatar = EditAvatarModal.#member.avatar.clone();
    EditAvatarModal.updateSelections();
    EditAvatarModal.updateAvatar();
  }

  static changeAvatar(event) {
    const avatar = EditAvatarModal.#tempAvatar;

    avatar.color = parseInt(document.getElementById("skinColor").value);
    avatar.shape = parseInt(document.getElementById("shapes").value);
    avatar.eyeShape = parseInt(document.getElementById("eyeShapes").value);
    avatar.mouthShape = parseInt(document.getElementById("mouthShapes").value);
    avatar.glassesShape = parseInt(document.getElementById("glassesShapes").value);

    EditAvatarModal.updateAvatar();
  }

  static randomizeAvatar(event, basic, iterations = 10, initialDelay = 50, maxDelay = 300) {
    let delay = initialDelay;

    for (let i = 0; i < iterations; i++) {
      setTimeout(() => {
        EditAvatarModal.#tempAvatar = Avatar.random(basic);
        EditAvatarModal.updateAvatar();
        EditAvatarModal.updateSelections();
      }, delay);
      delay += (maxDelay - initialDelay) / iterations;
    }
  }

  static close() {
    EditAvatarModal.#member.avatar = EditAvatarModal.#tempAvatar;
    EditAvatarModal.#modal.style.display = "none";
  }
}

class ConfirmationModal {
  static resolve;

  static show(message) {
    const modal = document.getElementById("confirmModal");
    const modalMessage = document.getElementById("confirmModalMessage");

    modalMessage.innerHTML = message;
    modal.style.display = "flex";

    return new Promise((resolve) => (ConfirmationModal.resolve = resolve));
  }

  static confirm() {
    ConfirmationModal.resolve(true);
    ConfirmationModal.hide();
  }

  static cancel() {
    ConfirmationModal.resolve(false);
    ConfirmationModal.hide();
  }

  static hide() {
    const modal = document.getElementById("confirmModal");
    modal.style.display = "none";
  }
}

class InfoModal {
  static show(message) {
    document.getElementById("infoModalMessage").innerHTML = message;
    document.getElementById("infoModal").style.display = "flex";
  }

  static hide() {
    document.getElementById("infoModal").style.display = "none";
  }
}

class LoginModal {
  static handleKeyPress(event, mode) {
    if (event.key === "Enter") {
      LoginModal[mode](event);
      event.target.blur();
      event.target.value = "";
    }
  }
}

class WelcomeModal {}

class Presenter {
  static id = "";

  static getTemplate() {
    return document.getElementById(this.id).content.querySelector("div").cloneNode(true);
  }
}

class CardFactory {
  static present(member) {
    switch (member.constructor.name) {
      case "Student":
        return StudentCard.present(member);
      case "Teacher":
        return TeacherCard.present(member);
      case "Class":
        return ClassCard.present(member);
      case "Group":
        return GroupCard.present(member);
      case "GroupMember":
        return GroupMemberCard.present(member);
      default:
        throw new Error("Unknown card type");
    }
  }
}

class ClassCard extends Presenter {
  static id = "classCardTemplate";

  static present(clazz) {
    const card = ClassCard.getTemplate();
    card.dataset.id = clazz.id;
    card.querySelector(".avatar").innerHTML = ClassAvatarBuilder.build().outerHTML;
    card.querySelector(".class-name").value = clazz.name;
    card.querySelector(".points").textContent = clazz.points;

    clazz.subscribe(ClassCard.update);

    App.addEventListener(card, ".class-name", "change", ClassManager.updateName, clazz);
    App.addEventListener(card, ".plus", "click", StudentManager.addPoints, clazz);
    App.addEventListener(card, ".points-input", "change", StudentManager.setPoints, clazz);

    return card;
  }

  static update(clazz) {
    const card = document.getElementById(`classCard`);
    card.querySelector(".class-name").value = clazz.name;
    card.querySelector(".points").textContent = clazz.points;
  }
}

class NewStudentCard extends Presenter {
  static id = "newStudentCardTemplate";

  static present() {
    const card = NewStudentCard.getTemplate();
    card.querySelector(".avatar").innerHTML = AvatarBuilder.build(new Avatar(4, 7, 3, 3, 0)).outerHTML;

    App.addEventListener(card, ".add-student", "click", ClassManager.addStudent);
    App.addEventListener(card, ".student-name", "keydown", NewStudentCard.keyDownHandler);

    return card;
  }

  static keyDownHandler(event) {
    if (event.key === "Enter") {
      ClassManager.addStudent(event);
      event.target.focus();
      event.target.value = "";
    }
  }
}

class StudentCard extends Presenter {
  static id = "studentCardTemplate";
  static draggedCard = null;

  static present(student) {
    const card = StudentCard.getTemplate();
    card.dataset.id = student.id;
    card.querySelector(".name").textContent = student.shortName();
    card.querySelector(".points").textContent = student.points;
    card.querySelector(".avatar").innerHTML = student.avatar.svg.outerHTML;

    student.subscribe(StudentCard.update);

    App.addEventListener(card, "", "click", StudentCard.toggleSelected);
    App.addEventListener(card, ".avatar-settings-button", "click", EditAvatarModal.show, student);
    App.addEventListener(card, ".delete", "click", ClassManager.deleteStudent, student);
    App.addEventListener(card, ".plus", "click", StudentManager.addPoints, student);
    App.addEventListener(card, ".points-input", "change", StudentManager.setPoints, student);
    App.addEventListener(card, "", "dragstart", View.current.handleDragStart);
    App.addEventListener(card, "", "dragover", View.current.handleDragOver);
    App.addEventListener(card, "", "dragend", View.current.handleDragEnd);
    App.addEventListener(card, "", "drop", View.current.handleDroppedCard);
    return card;
  }

  static update(student) {
    const card = document.querySelector(`[data-id="${student.id}"]`);
    card.querySelector(".name").textContent = student.shortName();
    card.querySelector(".points").textContent = student.points;
    card.querySelector(".avatar").innerHTML = student.avatar.svg.outerHTML;
  }

  static toggleSelected(event) {
    if (event.target.matches(".plus, .points-input, .delete, .avatar-settings-button")) {
      event.stopPropagation();
      return;
    }
    event.target.closest(".student-card").classList.toggle("selected");
  }
}

class TeacherCard extends StudentCard {
  static present(teacher) {
    const card = super.present(teacher);
    card.classList.add("teacher-card");
    return card;
  }
}

class GroupCard {
  static present(group) {
    const container = document.createElement("div");
    container.dataset.id = group.id;
    container.classList.add("group-card");
    group.members.forEach((member) => {
      const memberCard = GroupMemberCard.present(member);
      container.appendChild(memberCard);
      App.addEventListener(memberCard, "", "dragstart", GroupView.handleDragStart);
      App.addEventListener(memberCard, "", "dragend", GroupView.handleDragEnd);
    });
    return container;
  }
}

class GroupMemberCard {
  static present(memberId) {
    const container = document.createElement("div");
    const name = document.createElement("div");
    const avatar = document.createElement("div");
    container.dataset.id = memberId;
    container.classList.add("group-member-card");
    container.draggable = true;
    name.classList.add("group-member-card-name");
    avatar.classList.add("avatar");
    name.innerHTML = App.students.get(memberId).shortName();
    avatar.innerHTML = App.students.get(memberId).avatar.svg.outerHTML;
    container.appendChild(avatar);
    container.appendChild(name);
    return container;
  }
}

class DummyGroupMemberCard {
  static present() {
    const container = document.createElement("div");
    container.id = "dummy-group-member";
    container.classList.add("dummy-member");
    return container;
  }
}

class TaskBar extends Presenter {
  static initialized;

  static init() {
    if(TaskBar.initialized) return;
    TaskBar.initialized = true;
    window.addEventListener('loginStateChanged', TaskBar.updateMenu);
  }

  static show() {
    TaskBar.init();
    TaskBar.updateMenu();
    document.getElementById("taskbar").style.display = "flex";
  }

  static hide() {
    TaskBar.init();
    document.getElementById("taskbar").style.display = "none";
  }

  static updateMenu() {
    TaskBar.init();
    const loggedIn = LoginManager.loggedIn();
    document.querySelectorAll('.loggedIn').forEach(el => {
      el.style.display = loggedIn ? 'flex' : 'none';
    });
    document.querySelectorAll('.loggedOut').forEach(el => {
      el.style.display = loggedIn ? 'none' : 'flex';
    });
  }

  static updateTaskbarVisibility() {
    let taskbar = document.getElementById("taskbar");
    let studentsContainer = document.getElementById("studentsContainer");
    let scrollPosition = window.innerHeight + window.scrollY;
    let documentHeight = document.documentElement.scrollHeight;

    let taskbarHeight = taskbar.offsetHeight;
    studentsContainer.style.paddingBottom = taskbarHeight + 15 + "px";

    if (scrollPosition >= documentHeight - taskbarHeight || documentHeight <= window.innerHeight - taskbarHeight) {
      taskbar.style.visibility = "visible";
      taskbar.style.opacity = "1";
    } else {
      taskbar.style.visibility = "hidden";
      taskbar.style.opacity = "0";
    }
  }
}

class AvatarBuilder {
  static appendAvatar(avatar, parent) {
    const shape = ShapeStore.shape(avatar.shape);
    shape.setAttribute("fill", ColorStore.getColor(avatar.color));
    parent.appendChild(shape);
    avatar.glassesShape === 0 && parent.appendChild(ShapeStore.eyes(avatar.eyeShape));
    parent.appendChild(ShapeStore.mouth(avatar.mouthShape));
    parent.appendChild(ShapeStore.glasses(avatar.glassesShape));
    return parent;
  }

  static build(avatar) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    AvatarBuilder.appendAvatar(avatar, svg);
    return svg;
  }
}

class ClassAvatarBuilder extends AvatarBuilder {
  static build() {
    const size = 100;
    const scale = 0.6;
    const avatars = ClassAvatar.getAvatars();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const outerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    outerGroup.setAttribute("transform", `scale(${scale})`);

    for (let i = 0; i < avatars.length; i++) {
      const avatar = avatars[i];
      const posX = (i % 3) * (size / 2) - 12;
      const posY = Math.floor(i / 3) * (size / 2) - 12;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      g.setAttribute("transform", `translate(${posX}, ${posY})`);
      ClassAvatarBuilder.appendAvatar(avatar, g);
      outerGroup.appendChild(g);
    }

    svg.appendChild(outerGroup);
    return svg;
  }
}

class Filter {
  static apply() {
    const query = Filter.savedQuery || document.getElementById("searchInput").value.toLowerCase();
    const studentCards = document.querySelectorAll(".student-card:not(.dummy)");
    const clearButton = document.getElementById("clearButton");
  
    studentCards.forEach((card) => {
      const studentName = card.querySelector(".name").textContent.toLowerCase();
      card.style.display = studentName.includes(query) ? "flex" : "none";
    });
    window.dispatchEvent(new Event("resize"));
    if (query !== "")
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
    clearButton.style.display = query ? "inline" : "none";
  }
  
  static clearSearch() {
    document.getElementById("searchInput").value = "";
    Filter.savedQuery = "";
    Filter.apply();
    document.getElementById("searchInput").focus();
  }
  
  static clearOnEscape(event) {
    if (event.key === "Escape") {
      Filter.clearSearch();
    }
  }

}

class ConfettiColor {
  static confettiColors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#FFD700", "#00FF7F"];

  static get random() {
    return this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
  }
}

class ConfettiAnimation {
  static render() {
    const confettiContainer = document.createElement("div");
    confettiContainer.id = "confettiContainer";

    const numberOfConfetti = 1000;
    document.body.appendChild(confettiContainer);

    const tadaSound = document.getElementById("tadaSound");
    const newSound = tadaSound.cloneNode(true);
    newSound.play();

    for (let i = 0; i < numberOfConfetti; i++) {
      const confetti = document.createElement("div");
      confetti.classList.add("confetti-piece");

      confetti.style.backgroundColor = ConfettiColor.random;
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.animationDuration = `${Math.random() * 2 + 3}s`;
      confetti.style.animationDelay = `${Math.random() * 2}s`;

      confettiContainer.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
        confettiContainer.remove();
      }, 3000);
    }
  }
}

class SpinnerAnimation {
  static show() {
    document.getElementById("spinnerOverlay").style.display = "flex";
  }

  static hide() {
    document.getElementById("spinnerOverlay").style.display = "none";
  }
}

class PointsAnimation {
  static render(amount) {
    const popSound = document.getElementById("popSound");
    const newSound = popSound.cloneNode(true);
    setTimeout(() => {
      newSound.play();
    }, Math.random() * 250);

    for (let i = 0; i < amount; i++) {
      const emoji = document.createElement("div");
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
      emoji.textContent = randomEmoji;
      emoji.style.position = "fixed";
      emoji.style.fontSize = "100px";
      emoji.style.opacity = "1";
      emoji.style.zIndex = "1000";
      emoji.style.pointerEvents = "none";
      emoji.style.transition = `opacity ${0.5 + Math.random()}s ease-out`;

      const randomX = Math.random() * (window.innerWidth * 0.9);
      const randomY = Math.random() * (window.innerHeight * 0.9);
      emoji.style.left = `${randomX + window.innerWidth * 0.05}px`;
      emoji.style.top = `${randomY + window.innerHeight * 0.05}px`;

      const randomRotation = Math.random() * 60 - 30;
      emoji.style.transform = `translate(-50%, -50%) rotate(${randomRotation}deg)`;

      document.body.appendChild(emoji);

      setTimeout(() => {
        emoji.style.opacity = "0";
      }, 100 + Math.random() * 500);

      setTimeout(() => {
        if (emoji.parentElement) {
          document.body.removeChild(emoji);
        }
      }, 1600 + Math.random() * 1000);
    }
  }
}

class StateManager {
  static paused;

  static #hydrated;

  static #persistTimeout;
  static #persistLastCall;
  static #MAXDELAY = 5 * 1000;
  static #DELAY = 250;
  static #delayRemaining = StateManager.#MAXDELAY;

  static persist() {
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - StateManager.#persistLastCall;
    StateManager.#persistLastCall = currentTime;

    if (StateManager.#persistTimeout) clearTimeout(StateManager.#persistTimeout);

    StateManager.#delayRemaining -=
      timeSinceLastCall > StateManager.#MAXDELAY ? timeSinceLastCall : StateManager.#DELAY;

    const delay = StateManager.#delayRemaining <= 0 ? 0 : Math.min(StateManager.#delayRemaining, StateManager.#DELAY);

    StateManager.#persistTimeout = setTimeout(() => {
      StateManager.store();
      SyncManager.syncWithDelay();
      StateManager.#delayRemaining = StateManager.#MAXDELAY;
    }, delay);
  }

  static store() {
    localStorage.setItem("user", JSON.stringify(App.user));
    localStorage.setItem("classDetails", JSON.stringify(App.class));
    localStorage.setItem("students", JSON.stringify(App.students));
    localStorage.setItem("deletedStudents", JSON.stringify(Array.from(App.students.deletedStudents)));
    localStorage.setItem("group_2", JSON.stringify(Array.from(App.groupsBy2)));
    localStorage.setItem("group_3", JSON.stringify(Array.from(App.groupsBy3)));
  }

  static hydrate() {
    if (this.#hydrated) return;
    const user = JSON.parse(localStorage.getItem("user"));
    const c = JSON.parse(localStorage.getItem("classDetails"));
    const students = JSON.parse(localStorage.getItem("students"));
    const deletedStudents = JSON.parse(localStorage.getItem("deletedStudents"));
    const groupsBy2 = JSON.parse(localStorage.getItem("group_2"));
    const groupsBy3 = JSON.parse(localStorage.getItem("group_3"));

    App.user = user ? new User(user.code) : new User();
    App.students = Students.fromJSON(students) || new Students();
    App.students.mergeDeletedStudents(new Set(deletedStudents));
    App.class = c ? new Class(c.name, c.points, c.id, c.lastUpdated) : new Class("New Class", 0, "", 1);
    App.groupsBy2 = groupsBy2 ? new Groups(App.students, 2, groupsBy2) : new Groups(App.students, 2);
    App.groupsBy3 = groupsBy3 ? new Groups(App.students, 3, groupsBy3) : new Groups(App.students, 3);

    App.students.subscribe(StateManager.watcher);
    App.class.subscribe(StateManager.watcher);
    App.students.forEach((student) => student.subscribe(StateManager.watcher));
    App.user.subscribe(StateManager.watcher);

    StateManager.store();
    if (LoginManager.loggedIn()) SyncManager.sync();
    this.#hydrated = true;
  }

  static logout() {
    StateManager.studentsHistory = [];
    StateManager.classHistory = [];
    localStorage.clear();
  }

  static watcher(thing) {
    if (!StateManager.paused) StateManager.persist();
  }

  static pause() {
    StateManager.paused = true;
  }

  static continue() {
    StateManager.paused = false;
  }
}

class SyncManager {
  static #timeout;
  static #lastCall;
  static #MAXDELAY = 20 * 1000;
  static #DELAY = 1000;
  static #delayRemaining = SyncManager.#MAXDELAY;
  static #syncInterval;
  static #isSyncing = false;
  static #SYNC_INTERVAL = 60 * 1000;

  static #endpoint =
    "https://script.google.com/macros/s/AKfycbxnaoy77JysMOq21DVttfTAJfvDtpodECsoOwTGAEHBD_jlMreAzCuPYARaiY4xJz24YA/exec";

  static async signUpUser(email) {
    let formData = new URLSearchParams();
    formData.append("method", "signup");
    formData.append("email", email);

    return fetch(SyncManager.#endpoint, {
      method: "POST",
      body: formData,
    }).then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.text();
    });
  }

  static async loginWithCode(code) {
    return SyncManager.sync(code);
  }

  static async logout() {
    clearInterval(SyncManager.#syncInterval);
    clearTimeout(SyncManager.#timeout);
  }

  static updateState(forced = false) {
    StateManager.pause();
    App.class.updateFrom(SyncManager.class, forced);
    App.students.updateFrom(SyncManager.students);
    //App.groupsBy2 = SyncManager.groupsBy2;
    //App.groupsBy3 = SyncManager.groupsBy3;
    StateManager.continue();
    StateManager.store();
  }

  static async sync(code = App.user.code) {
    if (SyncManager.#isSyncing) return;
    console.log("sync started");
    SyncManager.#isSyncing = true;

    const sync = SyncManager.getData(code).then((response) => {
      SyncManager.updateState();
      return SyncManager.putData().then(() => {
        console.log("sync done");
        SyncManager.#isSyncing = false;
        if (!SyncManager.#syncInterval) {
          SyncManager.#syncInterval = setInterval(() => SyncManager.sync(), SyncManager.#SYNC_INTERVAL);
        }
      });
    });
    return sync;
  }

  static async syncWithDelay() {
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - SyncManager.#lastCall;
    SyncManager.#lastCall = currentTime;

    if (SyncManager.#timeout) clearTimeout(SyncManager.#timeout);

    SyncManager.#delayRemaining -= timeSinceLastCall > SyncManager.#MAXDELAY ? timeSinceLastCall : SyncManager.#DELAY;

    const delay = SyncManager.#delayRemaining <= 0 ? 0 : Math.min(SyncManager.#delayRemaining, SyncManager.#DELAY);

    SyncManager.#timeout = setTimeout(() => {
      App.class.lastUpdated = currentTime;
      SyncManager.sync();
      SyncManager.#delayRemaining = SyncManager.#MAXDELAY;
    }, delay);
  }

  static async getData(code) {
    return fetch(`${SyncManager.#endpoint}?code=${code}`)
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.text();
      })
      .then((text) => {
        if (text === "Not found" || text === "Missing code") throw new Error(text);
        return text;
      })
      .then((text) => {
        let data = JSON.parse(text);
        const students = data.students;
        const c = data.classDetails;
        const deletedStudents = data.deletedStudents || [];
        const groupsBy2 = data.group_2;
        const groupsBy3 = data.group_3;

        App.user = new User(code);
        SyncManager.students = Students.fromJSON(students) || undefined;
        SyncManager.students.deletedStudents = new Set(deletedStudents);
        SyncManager.class = c ? new Class(c.name, c.points, c.id, c.lastUpdated || 2) : undefined;
        SyncManager.groupsBy2 = groupsBy2 ? new Groups(App.students, 2, groupsBy2) : new Groups(App.students, 2);
        SyncManager.groupsBy3 = groupsBy3 ? new Groups(App.students, 3, groupsBy3) : new Groups(App.students, 3);

        StateManager.store();

        return text;
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        return Promise.reject(error);
      });
  }

  static async putData() {
    let data = {
      version: 2,
      classDetails: App.class,
      students: App.students,
      deletedStudents: Array.from(App.students.deletedStudents),
      groupsBy2: App.groupsBy2,
      groupsBy3: App.groupsBy3,
    };

    let formData = new URLSearchParams();
    formData.append("method", "saveData");
    formData.append("code", App.user.code);
    formData.append("data", JSON.stringify(data));

    return fetch(SyncManager.#endpoint, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((text) => {
        if (text !== "Data stored/updated") throw new Error(text);
        return text;
      })
      .then((text) => {
        return text;
      })
      .catch((error) => {
        console.error("Error loading data:", error);
      });
  }
}

class ExportImportManager {
  static exportCSV() {
    const csvContent = [
      ["Name", "Points", "Color", "Shape", "Eye", "Glass", "Hat", "Mouth", "ID", "Role"],
      [`"${App.class.name.replace(/"/g, '""')}"`, App.class.points],
      ...Array.from(App.students.values(), (s) => [
        `"${s.name.replace(/"/g, '""')}"`,
        s.points,
        s.avatar.color,
        s.avatar.shape,
        s.avatar.eyeShape,
        s.avatar.glassesShape,
        0,
        s.avatar.mouthShape,
        s.id,
        `"${s.constructor.name}"`
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const link = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csvContent], { type: "text/csv" })),
      download: "students_backup.csv",
    });

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static clickFileInput() {
    const fileInput = document.getElementById("fileInput");
    fileInput.click();
  }

  static importCSV(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      let [firstLine, ...lines] = e.target.result
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const hasHeaders = firstLine.startsWith("Name");
      if (hasHeaders) firstLine = lines.shift();

      let [name, points = "0"] = firstLine.split(",", 2);
      if (name.startsWith('"') && name.endsWith('"')) {
        name = name.slice(1, -1).replace(/""/g, '"');
      }

      App.class.name = name.trim();
      App.class.points = parseInt(points) || 0;

      App.students.clear();
      lines
        .map((line) => {
          const fields = line.split(",").map((field) => {
            if (field.startsWith('"') && field.endsWith('"')) {
              return field.slice(1, -1).replace(/""/g, '"');
            }
            return field.trim();
          });

          const [name, points, color, shape, eye, glass, _, mouth, id, role] = fields;

          App.students.deletedStudents.delete(id);
          App.students.set(id,Entity.fromJSON({name, points, color, shape, eye, glass, mouth, id, role}));
        })
    };
  
    reader.readAsText(file);
  }
}

class LoginManager {
  static login() {
    const email = document.getElementById("email").value;
    if (!email) {
      InfoModal.show("<p>You must enter an e-mail address before you can login.<p>");
      return;
    }

    SpinnerAnimation.show();

    SyncManager.signUpUser(email)
      .then((responseCode) => LoginManager.handleSignupResponse(responseCode))
      .catch(() => {
        InfoModal.show("<p>An error occurred while signing up. Please try again later.</p>");
        SpinnerAnimation.hide();
      });
  }

  static handleSignupResponse(responseCode) {
    SpinnerAnimation.hide();
    switch (responseCode) {
      case "User signed up successfully":
        InfoModal.show("<p>Success! Check your email to sign in.</p>");
        window.location.hash = "#";
        break;
      case "Missing email parameter":
      case "Invalid email format":
        InfoModal.show(
          "<p>Something is not quite right with that e-mail, try a different address, or try again later.</p>"
        );
        break;
      default:
        InfoModal.show("<p>Something went wrong, check your email or try again later.</p>");
    }
  }

  static loginWithCode() {
    const code = document.getElementById("code").value;
    if (!code) {
      InfoModal.show(
        "<p>You must enter a code before you can login.  If you do not have a code sign up with e-mail.<p>"
      );
      return;
    }

    SpinnerAnimation.show();

    SyncManager.getData(code)
      .then((responseCode) => LoginManager.handleLoginResponse(responseCode))
      .catch(() => {
        InfoModal.show("<p>An error occurred while signing in. Please try again later.</p>");
        SpinnerAnimation.hide();
      });
  }

  static checkForLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("code")) {
      App.user = new User(urlParams.get("code"));
      window.history.replaceState({}, "", `${window.location.pathname}`);
      SpinnerAnimation.show();

      SyncManager.getData(App.user.code)
        .then((responseCode) => LoginManager.handleLoginResponse(responseCode))
        .catch(() => {
          InfoModal.show("<p>An error occurred while signing in. Please try again later.</p>");
          SpinnerAnimation.hide();
        });
    }
  }

  static async handleLoginResponse(responseCode) {
    SpinnerAnimation.hide();
    window.location.hash = "#";

    if (SyncManager.class.lastUpdated < App.class.lastUpdated) {
      const confirmed = await ConfirmationModal.show(
        "Cloud save is older than local class data. Do you want to keep your local data?"
      );
      if (confirmed) {
        InfoModal.show("<p>Keeping local data.  Use the 'Sync' menu option if you change your mind.</p>");
      } else {
        SyncManager.updateState(true);
      }
    } else {
      SyncManager.updateState();
    }
    window.dispatchEvent(new Event("loginStateChanged"));
    SyncManager.sync(App.user.code);
  }

  static async logout() {
    const confirmed = await ConfirmationModal.show(
      "<p>Please ensure you have synced or exported your data before logging out.  Any unsaved changes will be lost.</p><Continue to logout?</p>"
    );
    if (confirmed) {
      App.logout();
      window.dispatchEvent(new Event("loginStateChanged"));
      window.location.reload();
    }
  }

  static loggedIn() {
    return !!App.user?.code;
  }
}

class ClassManager {
  static updateName(event) {
    const card = event.target.closest(".card");
    const nameInput = card.querySelector("#className");
    nameInput.blur();
    App.class.name = nameInput.value.trim().replace(/['"\\;=%<>()\[\]{},]/g, '');
  }

  static addStudent(event) {
    const card = event.target.closest(".card");
    const nameInput = card.querySelector("#newStudentName");
    const student = new Student(nameInput.value.trim());
    App.students.set(student.id, student);
  }

  static async deleteStudent(event, student) {
    const confirmed = await ConfirmationModal.show("Are you sure you want to delete this student?");
    if (confirmed) {
      App.students.delete(student.id);
    }
  }

  static bulkUpdatePoints(event) {
    const cards = document.querySelectorAll(".student-card.selected");
    cards.forEach((card) => {
      StudentManager.addPoints(event, App.students.get(card.dataset.id));
    });
  }

  static async resetPoints() {
    const confirmed = await ConfirmationModal.show("Are you sure you want to reset all points to zero?");
    if (confirmed) {
      const cards = document.querySelectorAll(".student-card:not(.dummy)");
      cards.forEach((card) => {
        StudentManager.resetPoints(App.students.get(card.dataset.id));
      });
      StudentManager.resetPoints(App.class);
    }
  }

  static async clearStudents() {
    const confirmed = await ConfirmationModal.show(
      "Are you sure you want to clear all students from the class and reset the class points to zero?"
    );
    if (confirmed) {
      App.students.clear();
      StudentManager.resetPoints(App.class);
    }
  }

  static async generateStudents() {
    const confirmed = await ConfirmationModal.show(
      "Are you sure you want to clear all students from the class and replace them with default students?"
    );
    if (confirmed) {
      App.students.updateFrom(Students.fromDefault());
    }
  }
}

class StudentManager {
  static addPoints(event, student) {
    const value = parseInt(event.target.dataset.value);
    PointsAnimation.render(value);
    student.points += value;
  }

  static setPoints(event, student) {
    const inputElement = event.target;
    PointsAnimation.render(20);
    student.setPoints(inputElement.value);
    inputElement.value = "";
  }

  static resetPoints(student) {
    student.points = 0;
  }
}

class App {
  static user;
  static class;
  static students;
  static groupsBy2;
  static groupsBy3;

  static addEventListener(node, selector, type, callback, ...args) {
    const eventHandler = (e) => callback(e, ...args);

    if (!selector) {
      node.addEventListener(type, eventHandler);
    } else {
      node.querySelectorAll(selector).forEach((n) => {
        n.addEventListener(type, eventHandler);
      });
    }
  }

  static start() {
    LoginManager.checkForLogin();
    StateManager.hydrate();
    View.show();
    if( !LoginManager.loggedIn()) {
      window.location.hash = "#welcomeView";
    }
  }

  static async sync() {
    if (!LoginManager.loggedIn()) {
      InfoModal.show("<p>You must be logged in to sync your data.</p>");
    } else {
      const confirmed = await ConfirmationModal.show("<p>Are you sure you want to sync your data?</p>");
      if (confirmed) {
        SpinnerAnimation.show();
        SyncManager.sync().finally(() => {
          SpinnerAnimation.hide();
        });
      }
    }
  }

  static logout() {
    SyncManager.logout();
    StateManager.logout();
    App.class = undefined;
    App.user = undefined;
    App.students = undefined;
    App.groupsBy2 = undefined;
    App.groupsBy3 = undefined;
  }

  static updateGroups(incoming) {
    App.groupsBy2 = new Groups(App.students, 2);
    App.groupsBy3 = new Groups(App.students, 3);
  }

}

class Config {
  static DEFAULT_STUDENTS = [
    {
      name: "Alexander Garcia",
    },
    {
      name: "Amelia Thompson",
    },
    {
      name: "Ava Miller",
    },
    {
      name: "Benjamin Thomas",
    },
    {
      name: "David Zane",
    },
    {
      name: "Emma Johnson",
    },
    {
      name: "Emma Kilpatrick",
    },
    {
      name: "Evelyn Clark",
    },
    {
      name: "Harper Martinez",
    },
    {
      name: "Henry Martin",
    },
    {
      name: "Isabella Anderson",
    },
    {
      name: "James Dean",
    },
    {
      name: "James Taylor",
    },
    {
      name: "Liam Smith",
    },
    {
      name: "Lucas White",
    },
    {
      name: "Matilda McCoy",
    },
    {
      name: "Mia Jackson",
    },
    {
      name: "Noah Davis",
    },
  ];

  static get routes() {
    return {
      "/": ClassView,
      "/groupBy2": GroupView,
      "/groupBy3": GroupView,
      "/classPhoto": ClassPhotoView,
      "/allAvatars": AllAvatarsView,
      "/randomAvatar": RandomAvatarView,
    };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  App.start();
});

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }
  hash += Math.floor(Math.random() * 0x811c9dc5);
  hash += Date.now();
  return encodeBase62(Math.floor(Math.random() * 0x811c9dc5)) + encodeBase62(hash) + encodeBase62(Date.now());
}

function encodeBase62(num) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let encoded = "";
  while (num > 0) {
    const remainder = num % 62;
    encoded = chars[remainder] + encoded;
    num = Math.floor(num / 62);
  }
  return encoded || "0";
}
