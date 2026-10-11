/**
 * ==========================================================================
 * TaskFlow - Premium Productivity Web Application Logic
 * Syntecxhub Week 2 Front-End Development
 * ==========================================================================
 *
 * Core Capabilities:
 * 1. Full Dashboard Metrics (Total, Completed, Pending, Overdue) with One-Click Filtering.
 * 2. Visual Completion Progress Bar calculation.
 * 3. Multi-Criteria Filtering (Overview views, Category views, Overdue view).
 * 4. Multi-Option Task Sorting (Due Date, Priority, Title, Date Added).
 * 5. Real-Time Search by task title.
 * 6. Task Management: Add, Toggle, Edit, and Delete with 5-Second Undo Toast.
 * 7. Contextual Empty State messaging tailored to the active filter.
 * 8. Modal Dialog with Focus Management and Escape Key Support.
 * 9. PWA Service Worker caching and Native Install Prompt handler.
 * 10. Safe DOM manipulation avoiding raw innerHTML injection.
 */

// --------------------------------------------------------------------------
// 1. Constants & State Management
// --------------------------------------------------------------------------
const STORAGE_KEY = "syntecxhub_tasks";
const SIDEBAR_STORAGE_KEY = "taskflow_sidebar_collapsed";

function getISODateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TODAY_STR = getISODateString();

// In-memory reactive state
let tasks = [];
let currentFilter = "all";
let currentSort = "priority-desc";
let currentPriority = "all";
let searchQuery = "";
let lastDeletedTask = null;
let toastTimeout = null;
let lastFocusedElementBeforeModal = null;
let storageError = null;

// --------------------------------------------------------------------------
// 2. DOM Elements Selection
// --------------------------------------------------------------------------
// Form controls
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskDescription = document.getElementById("task-description");
const taskCategory = document.getElementById("task-category");
const taskDueDate = document.getElementById("task-due-date");
const taskPriority = document.getElementById("task-priority");
const inputError = document.getElementById("input-error");
const quickAddBtn = document.getElementById("quick-add-btn");

// Board, Search & Sort
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const emptyStateDesc = document.getElementById("empty-state-desc");
const currentViewTitle = document.getElementById("current-view-title");
const taskCounter = document.getElementById("task-counter");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const priorityFilter = document.getElementById("priority-filter");
const currentDateText = document.getElementById("current-date-text");
const welcomeEyebrow = document.getElementById("welcome-eyebrow");
const progressSummary = document.getElementById("progress-summary");
const todaySummary = document.getElementById("today-summary");
const todayDueCount = document.getElementById("today-due-count");
const highPriorityCount = document.getElementById("high-priority-count");
const productivityInsight = document.getElementById("productivity-insight");
const upcomingList = document.getElementById("upcoming-list");
const upcomingEmpty = document.getElementById("upcoming-empty");
const offlinePill = document.getElementById("offline-pill");

// Metrics & Progress
const metricTotal = document.getElementById("metric-total");
const metricCompleted = document.getElementById("metric-completed");
const metricCompletedRate = document.getElementById("metric-completed-rate");
const metricPending = document.getElementById("metric-pending");
const metricOverdue = document.getElementById("metric-overdue");
const progressPercentage = document.getElementById("progress-percentage");
const progressFill = document.getElementById("progress-fill");
const metricCards = document.querySelectorAll(".metric-card");

// Navigation & Sidebar
const sidebar = document.getElementById("sidebar");
const appLayout = document.querySelector(".app-layout");
const mobileSidebarToggle = document.getElementById("mobile-sidebar-toggle");
const sidebarCollapseBtn = document.getElementById("sidebar-collapse-btn");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const navItems = document.querySelectorAll(".nav-item");

// Badges
const badgeAll = document.getElementById("badge-all");
const badgeToday = document.getElementById("badge-today");
const badgeUpcoming = document.getElementById("badge-upcoming");
const badgeCompleted = document.getElementById("badge-completed");
const badgeWork = document.getElementById("badge-work");
const badgePersonal = document.getElementById("badge-personal");
const badgeStudy = document.getElementById("badge-study");

// Edit Modal
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editTaskId = document.getElementById("edit-task-id");
const editTaskText = document.getElementById("edit-task-text");
const editTaskDescription = document.getElementById("edit-task-description");
const editTaskCategory = document.getElementById("edit-task-category");
const editTaskDueDate = document.getElementById("edit-task-due-date");
const editTaskPriority = document.getElementById("edit-task-priority");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");

// Toast Notifications
const toastContainer = document.getElementById("toast-container");

// PWA Install
const installPwaBtn = document.getElementById("install-pwa-btn");
let deferredInstallPrompt = null;

// --------------------------------------------------------------------------
// 3. Storage & Schema Normalization
// --------------------------------------------------------------------------

function normalizeTask(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const storedTitle = typeof raw.text === "string" ? raw.text : raw.title;
  const text = typeof storedTitle === "string" ? storedTitle.trim() : "";
  if (!text) return null;
  const dateParts = typeof raw.dueDate === "string" ? raw.dueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  const dueDate = dateParts && (() => {
    const [, year, month, day] = dateParts;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return parsedDate.getUTCFullYear() === Number(year)
      && parsedDate.getUTCMonth() === Number(month) - 1
      && parsedDate.getUTCDate() === Number(day)
      ? raw.dueDate
      : "";
  })();

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : generateTaskId(),
    text,
    description: typeof raw.description === "string" ? raw.description.slice(0, 500) : "",
    completed: raw.completed === true || raw.completed === 1 || raw.completed === "true" || raw.isCompleted === true,
    category: ["work", "personal", "study"].includes(String(raw.category).toLowerCase())
      ? String(raw.category).toLowerCase()
      : "work",
    priority: ["high", "medium", "low"].includes(String(raw.priority).toLowerCase())
      ? String(raw.priority).toLowerCase()
      : "medium",
    dueDate: dueDate || "",
    createdAt: typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))
      ? raw.createdAt
      : new Date().toISOString(),
  };
}

function loadTasks() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData === null) {
      const compatibleData = localStorage.getItem("taskflow_tasks");
      if (compatibleData !== null) {
        const compatibleTasks = JSON.parse(compatibleData);
        if (Array.isArray(compatibleTasks)) {
          const migratedTasks = compatibleTasks.map(normalizeTask).filter(Boolean);
          saveTasks(migratedTasks);
          return migratedTasks;
        }
        storageError = "Compatible saved task data has an unsupported format. It was left unchanged.";
        return [];
      }
      saveTasks([]);
      return [];
    }

    const parsed = JSON.parse(savedData);
    if (Array.isArray(parsed)) {
      const normalizedTasks = parsed.map(normalizeTask).filter(Boolean);
      if (normalizedTasks.length !== parsed.length) {
        storageError = "Some invalid saved tasks were skipped. Review your saved task data if anything is missing.";
      }
      return normalizedTasks;
    }
    storageError = "Saved task data has an unsupported format. It was left unchanged.";
    return [];
  } catch (error) {
    console.error("Error loading tasks from localStorage:", error);
    storageError = "Task storage is unavailable or could not be read. Changes may not persist.";
    return [];
  }
}

function saveTasks(tasksToSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
    return true;
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error);
    storageError = "Could not save tasks to this browser. Changes may not persist.";
    return false;
  }
}

function persistTasks() {
  if (saveTasks(tasks)) return true;
  showToast(storageError || "Could not save tasks to this browser. Changes may not persist.");
  return false;
}

function generateTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// --------------------------------------------------------------------------
// 4. Date & Header Setup
// --------------------------------------------------------------------------

function updateHeaderDate() {
  const now = new Date();
  const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
  if (currentDateText) {
    currentDateText.textContent = now.toLocaleDateString("en-US", options);
  }
  if (taskDueDate && !taskDueDate.value) {
    taskDueDate.value = TODAY_STR;
  }
}

// --------------------------------------------------------------------------
// 5. Metrics & Progress Engine
// --------------------------------------------------------------------------

function updateDashboardMetrics() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < TODAY_STR).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Metric cards
  if (metricTotal) metricTotal.textContent = total;
  if (metricCompleted) metricCompleted.textContent = completed;
  if (metricCompletedRate) metricCompletedRate.textContent = `${rate}% done · Click to view`;
  if (metricPending) metricPending.textContent = pending;
  if (metricOverdue) metricOverdue.textContent = overdue;
  if (clearCompletedBtn) clearCompletedBtn.disabled = completed === 0;

  // Active state on metric cards
  metricCards.forEach((card) => {
    const filterType = card.dataset.metricFilter;
    if (filterType === currentFilter || (currentFilter === "all-tasks" && filterType === "all")) {
      card.classList.add("active-metric");
    } else {
      card.classList.remove("active-metric");
    }
  });

  // Progress Bar
  if (progressPercentage) progressPercentage.textContent = `${rate}%`;
  if (progressFill) progressFill.style.width = `${rate}%`;
  const progressTrack = document.getElementById("progress-track");
  if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(rate));
  if (progressSummary) {
    progressSummary.textContent = total
      ? `${completed} of ${total} ${total === 1 ? "task" : "tasks"} completed`
      : "Add a task to start building momentum.";
  }

  // Sidebar navigation counts
  const todayCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate === TODAY_STR).length;
  const upcomingCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate > TODAY_STR).length;
  const workCount = tasks.filter((t) => t.category === "work").length;
  const personalCount = tasks.filter((t) => t.category === "personal").length;
  const studyCount = tasks.filter((t) => t.category === "study").length;

  if (badgeAll) badgeAll.textContent = total;
  if (badgeToday) badgeToday.textContent = todayCount;
  if (badgeUpcoming) badgeUpcoming.textContent = upcomingCount;
  if (badgeCompleted) badgeCompleted.textContent = completed;
  if (badgeWork) badgeWork.textContent = workCount;
  if (badgePersonal) badgePersonal.textContent = personalCount;
  if (badgeStudy) badgeStudy.textContent = studyCount;
  renderProductivityOverview();
}

function renderProductivityOverview() {
  const todayTasks = tasks.filter((task) => task.dueDate === TODAY_STR && !task.completed);
  const completedTodayTasks = tasks.filter((task) => task.dueDate === TODAY_STR && task.completed);
  const urgentTasks = tasks.filter((task) => !task.completed && task.priority === "high");

  if (todayDueCount) todayDueCount.textContent = todayTasks.length;
  if (highPriorityCount) highPriorityCount.textContent = urgentTasks.length;
  if (todaySummary) {
    todaySummary.textContent = todayTasks.length
      ? `${todayTasks.length} ${todayTasks.length === 1 ? "task" : "tasks"} still on today's list${completedTodayTasks.length ? ` · ${completedTodayTasks.length} done` : ""}.`
      : "No tasks due today. Keep a little momentum going.";
  }
  if (productivityInsight) {
    const completed = tasks.filter((task) => task.completed).length;
    productivityInsight.textContent = completed
      ? `${completed} ${completed === 1 ? "task" : "tasks"} completed so far. Every small win builds momentum.`
      : "Every task you finish is momentum in motion.";
  }
  if (welcomeEyebrow) {
    welcomeEyebrow.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    }).toUpperCase();
  }

  if (!upcomingList) return;
  upcomingList.replaceChildren();
  const upcomingTasks = tasks
    .filter((task) => !task.completed && task.dueDate && task.dueDate >= TODAY_STR)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)
      || ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
    .slice(0, 4);

  upcomingTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "upcoming-item";
    const date = document.createElement("span");
    date.className = "upcoming-date";
    date.textContent = task.dueDate === TODAY_STR
      ? "Today"
      : new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const details = document.createElement("span");
    details.className = "upcoming-details";
    const title = document.createElement("span");
    title.className = "upcoming-task-title";
    title.textContent = task.text;
    const category = document.createElement("span");
    category.className = "upcoming-category";
    category.textContent = task.category;
    details.append(title, category);
    const priority = document.createElement("span");
    priority.className = `upcoming-priority priority-${task.priority}`;
    priority.setAttribute("aria-label", `${task.priority} priority`);
    item.append(date, details, priority);
    upcomingList.appendChild(item);
  });
  if (upcomingEmpty) upcomingEmpty.hidden = upcomingTasks.length > 0;
}

// --------------------------------------------------------------------------
// 6. Filtering & Sorting Logic
// --------------------------------------------------------------------------

function getFilteredTasks() {
  let list = tasks.filter((task) => {
    // Search query matching
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const match = task.text.toLowerCase().includes(query) || task.description.toLowerCase().includes(query);
      if (!match) return false;
    }
    if (currentPriority !== "all" && task.priority !== currentPriority) return false;

    // Active category/view filter
    switch (currentFilter) {
      case "all":
      case "all-tasks":
        return true;
      case "today":
        return task.dueDate === TODAY_STR && !task.completed;
      case "upcoming":
        return task.dueDate && task.dueDate > TODAY_STR && !task.completed;
      case "completed":
        return task.completed === true;
      case "pending":
        return task.completed === false;
      case "overdue":
        return !task.completed && task.dueDate && task.dueDate < TODAY_STR;
      case "work":
      case "personal":
      case "study":
        return task.category === currentFilter;
      default:
        return true;
    }
  });

  // Apply sorting
  const priorityWeights = { high: 3, medium: 2, low: 1 };

  return list.sort((a, b) => {
    switch (currentSort) {
      case "date-asc": {
        // Items with due dates come first, sorted earliest to latest
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      case "priority-desc": {
        const weightA = priorityWeights[a.priority] || 2;
        const weightB = priorityWeights[b.priority] || 2;
        return weightB - weightA;
      }
      case "title-asc": {
        return a.text.localeCompare(b.text);
      }
      case "newest":
      default: {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      }
    }
  });
}

function getFilterTitle(filter) {
  switch (filter) {
    case "all":
    case "all-tasks":
      return "My Tasks";
    case "today":
      return "Today's Tasks";
    case "upcoming":
      return "Upcoming Tasks";
    case "completed":
      return "Completed Tasks";
    case "pending":
      return "Pending Tasks";
    case "overdue":
      return "Overdue Tasks";
    case "work":
      return "Work Tasks";
    case "personal":
      return "Personal Tasks";
    case "study":
      return "Study Tasks";
    default:
      return "Tasks";
  }
}

function getContextualEmptyStateMessage() {
  if (searchQuery) {
    return `No tasks matching "${searchQuery}". Try a different search term.`;
  }
  if (currentPriority !== "all") {
    return `No ${currentPriority}-priority tasks match this view.`;
  }
  switch (currentFilter) {
    case "today":
      return "No tasks scheduled for today. Enjoy your day or plan ahead!";
    case "upcoming":
      return "No upcoming tasks found. Add a future due date to schedule tasks.";
    case "completed":
      return "No completed tasks yet. Finish a task to see your achievements here.";
    case "pending":
      return "All caught up! You have no pending tasks.";
    case "overdue":
      return "Great job! You have zero overdue tasks.";
    case "work":
      return "No work tasks yet. Categorize a task as Work to organize your projects.";
    case "personal":
      return "No personal tasks yet. Add a personal task to balance your day.";
    case "study":
      return "No study tasks yet. Track coursework and reading goals here.";
    default:
      return "You have no tasks in this view. Use the form above to add a new task.";
  }
}

// --------------------------------------------------------------------------
// 7. DOM Rendering (Safe Element Creation)
// --------------------------------------------------------------------------

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIndex = parseInt(month, 10) - 1;
  return `${months[mIndex] || month} ${parseInt(day, 10)}`;
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = task.id;
  li.dataset.priority = task.priority;
  if (task.completed) {
    li.classList.add("completed");
  }

  // Left Section: Checkbox + Title + Meta tags
  const taskMain = document.createElement("div");
  taskMain.className = "task-main";

  // Checkbox wrapper
  const checkboxWrapper = document.createElement("label");
  checkboxWrapper.className = "task-checkbox-wrapper";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as completed`);

  checkbox.addEventListener("change", () => {
    toggleTaskCompletion(task.id);
  });

  const customCheckbox = document.createElement("span");
  customCheckbox.className = "custom-checkbox";
  customCheckbox.setAttribute("aria-hidden", "true");

  checkboxWrapper.appendChild(checkbox);
  checkboxWrapper.appendChild(customCheckbox);

  // Details: Title + Tag row
  const details = document.createElement("div");
  details.className = "task-details";

  const titleSpan = document.createElement("span");
  titleSpan.className = "task-title";
  titleSpan.textContent = task.text; // Safe: XSS protection
  details.appendChild(titleSpan);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    details.appendChild(description);
  }

  const metaRow = document.createElement("div");
  metaRow.className = "task-meta-tags";

  // Category Tag
  const catTag = document.createElement("span");
  catTag.className = `task-tag tag-${task.category}`;
  catTag.textContent = task.category;
  metaRow.appendChild(catTag);

  // Priority Tag
  if (task.priority) {
    const priorityTag = document.createElement("span");
    priorityTag.className = `task-tag tag-priority-${task.priority}`;
    priorityTag.textContent = `${task.priority} priority`;
    metaRow.appendChild(priorityTag);
  }

  // Due Date Tag
  if (task.dueDate) {
    const dateTag = document.createElement("span");
    const isOverdue = !task.completed && task.dueDate < TODAY_STR;
    dateTag.className = `tag-date ${isOverdue ? "tag-overdue" : ""}`;
    dateTag.textContent = isOverdue
      ? `Overdue · ${formatDisplayDate(task.dueDate)}`
      : `Due ${formatDisplayDate(task.dueDate)}`;
    metaRow.appendChild(dateTag);
  }

  details.appendChild(metaRow);

  taskMain.appendChild(checkboxWrapper);
  taskMain.appendChild(details);

  // Actions Section: Edit + Delete
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "task-actions";

  // Edit Button
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "action-icon-btn edit-btn";
  editBtn.setAttribute("aria-label", `Edit task "${task.text}"`);
  editBtn.title = "Edit task";
  editBtn.appendChild(createActionIcon("M14 5l5 5M4 20l4.2-.9L19 8.3a2.8 2.8 0 0 0-4-4L4.2 15.1 4 20Z"));
  editBtn.addEventListener("click", () => {
    lastFocusedElementBeforeModal = editBtn;
    openEditModal(task);
  });

  // Delete Button
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "action-icon-btn delete-btn";
  deleteBtn.setAttribute("aria-label", `Delete task "${task.text}"`);
  deleteBtn.title = "Delete task";
  deleteBtn.appendChild(createActionIcon("M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"));
  deleteBtn.addEventListener("click", () => {
    deleteTaskWithUndo(task.id);
  });

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);

  li.appendChild(taskMain);
  li.appendChild(actionsDiv);

  return li;
}

function createActionIcon(pathData) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  icon.appendChild(path);
  return icon;
}

function renderTasks() {
  if (!taskList) return;

  taskList.innerHTML = "";
  const filtered = getFilteredTasks();

  // Update header and count badge
  if (currentViewTitle) {
    currentViewTitle.textContent = getFilterTitle(currentFilter);
  }
  if (taskCounter) {
    const count = filtered.length;
    taskCounter.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
  }

  // Handle empty state
  if (filtered.length === 0) {
    emptyState.hidden = false;
    if (emptyStateDesc) {
      emptyStateDesc.textContent = getContextualEmptyStateMessage();
    }
  } else {
    emptyState.hidden = true;
    filtered.forEach((task) => {
      taskList.appendChild(createTaskElement(task));
    });
  }

  // Refresh metrics and progress bar
  updateDashboardMetrics();
}

// --------------------------------------------------------------------------
// 8. Task Operations (Add, Toggle, Edit, Delete with Undo)
// --------------------------------------------------------------------------

function handleAddTask(event) {
  event.preventDefault();

  const textVal = taskInput.value.trim();
  if (!textVal) {
    showInputError("Please enter a task title before adding.");
    return;
  }

  clearInputError();

  const newTask = {
    id: generateTaskId(),
    text: textVal,
    description: taskDescription ? taskDescription.value.trim() : "",
    completed: false,
    category: taskCategory ? taskCategory.value : "work",
    dueDate: taskDueDate ? taskDueDate.value : TODAY_STR,
    priority: taskPriority ? taskPriority.value : "medium",
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  const saved = saveTasks(tasks);
  renderTasks();
  showToast(saved ? "Task added successfully." : "Task added for this session, but could not be saved.");

  // Reset inputs
  taskInput.value = "";
  if (taskDescription) taskDescription.value = "";
  if (taskDueDate) taskDueDate.value = TODAY_STR;
  taskInput.focus();
}

function toggleTaskCompletion(id) {
  tasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  persistTasks();
  renderTasks();
}

function deleteTaskWithUndo(id) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return;
  if (!window.confirm(`Delete "${tasks[index].text}"? You can undo this for a few seconds.`)) return;

  // Stash task for undo
  lastDeletedTask = {
    task: tasks[index],
    index: index,
  };

  // Remove from list
  tasks.splice(index, 1);
  const saved = saveTasks(tasks);
  if (!saved) storageError = "Task removed for this session, but could not be saved.";
  renderTasks();

  // Trigger toast with undo
  showToast(saved ? `Task "${lastDeletedTask.task.text}" deleted` : "Task removed for this session, but could not be saved.", () => {
    // Undo action
    if (lastDeletedTask) {
      tasks.splice(lastDeletedTask.index, 0, lastDeletedTask.task);
      persistTasks();
      renderTasks();
      lastDeletedTask = null;
    }
  });
}

function handleClearCompleted() {
  const completedTasks = tasks.filter((t) => t.completed);
  if (completedTasks.length === 0) return;

  const previousTasks = tasks;
  tasks = tasks.filter((task) => !task.completed);
  const saved = saveTasks(tasks);
  renderTasks();
  showToast(saved
    ? `Cleared ${completedTasks.length} completed tasks.`
    : "Completed tasks cleared for this session, but could not be saved.",
  saved ? () => {
    tasks = previousTasks;
    persistTasks();
    renderTasks();
  } : null);
}

// --------------------------------------------------------------------------
// 9. Toast Notification System
// --------------------------------------------------------------------------

function showToast(message, undoCallback = null) {
  if (!toastContainer) return;

  // Clear existing toast if any
  toastContainer.innerHTML = "";
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  const toast = document.createElement("div");
  toast.className = "toast";

  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (undoCallback) {
    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "toast-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", () => {
      toast.remove();
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = null;
      undoCallback();
    });
    toast.appendChild(undoBtn);
  }

  toastContainer.appendChild(toast);

  // Auto-dismiss after 5 seconds
  toastTimeout = setTimeout(() => {
    toast.remove();
    lastDeletedTask = null;
  }, 5000);
}

// --------------------------------------------------------------------------
// 10. Accessible Edit Task Modal
// --------------------------------------------------------------------------

function openEditModal(task) {
  if (!editModal) return;
  editTaskId.value = task.id;
  editTaskText.value = task.text;
  if (editTaskDescription) editTaskDescription.value = task.description || "";
  if (editTaskCategory) editTaskCategory.value = task.category || "work";
  if (editTaskDueDate) editTaskDueDate.value = task.dueDate || "";
  if (editTaskPriority) editTaskPriority.value = task.priority || "medium";

  editModal.hidden = false;
  editTaskText.focus();
}

function closeEditModal() {
  if (!editModal) return;
  editModal.hidden = true;
  if (lastFocusedElementBeforeModal) {
    lastFocusedElementBeforeModal.focus();
    lastFocusedElementBeforeModal = null;
  }
}

function handleSaveEdit(event) {
  event.preventDefault();
  const id = editTaskId.value;
  const newText = editTaskText.value.trim();

  if (!newText) {
    editTaskText.setCustomValidity("Please enter a task title before saving.");
    editTaskText.reportValidity();
    editTaskText.focus();
    return;
  }

  tasks = tasks.map((task) => {
    if (task.id === id) {
      return {
        ...task,
        text: newText,
        description: editTaskDescription ? editTaskDescription.value.trim() : task.description || "",
        category: editTaskCategory ? editTaskCategory.value : task.category,
        dueDate: editTaskDueDate ? editTaskDueDate.value : task.dueDate,
        priority: editTaskPriority ? editTaskPriority.value : task.priority,
      };
    }
    return task;
  });

  const saved = saveTasks(tasks);
  closeEditModal();
  renderTasks();
  showToast(saved ? "Task updated successfully." : "Task updated for this session, but could not be saved.");
}

// Trap focus inside modal
function setupModalAccessibility() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editModal && !editModal.hidden) {
      closeEditModal();
    }
  });
}

// --------------------------------------------------------------------------
// 11. Navigation, Search, Sort & Metric Card Interactions
// --------------------------------------------------------------------------

function activateFilter(filter) {
  currentFilter = filter;
  navItems.forEach((navBtn) => {
    const isActive = navBtn.dataset.filter === filter;
    navBtn.classList.toggle("active", isActive);
    if (isActive) navBtn.setAttribute("aria-current", "page");
    else navBtn.removeAttribute("aria-current");
  });
  if (sidebar && sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
    if (mobileSidebarToggle) mobileSidebarToggle.setAttribute("aria-expanded", "false");
  }
  renderTasks();
}

function setupNavigation() {
  // Sidebar navigation items
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      activateFilter(btn.dataset.filter || "all");
    });
  });

  document.querySelectorAll(".rail-link, .insight-link").forEach((button) => {
    button.addEventListener("click", () => activateFilter(button.dataset.filter || "all"));
  });

  // Clickable Metric Summary Cards
  metricCards.forEach((card) => {
    card.addEventListener("click", () => {
      const filter = card.dataset.metricFilter || "all";
      activateFilter(filter);
    });

    // Keyboard support for metric cards
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Mobile drawer toggle
  if (mobileSidebarToggle && sidebar) {
    mobileSidebarToggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("open");
      mobileSidebarToggle.setAttribute("aria-expanded", String(isOpen));
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle("active", isOpen);
    });
  }

  if (appLayout && sidebarCollapseBtn) {
    try {
      const collapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
      appLayout.classList.toggle("sidebar-collapsed", collapsed);
      sidebarCollapseBtn.setAttribute("aria-pressed", String(collapsed));
      sidebarCollapseBtn.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      sidebarCollapseBtn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    } catch (error) {
      console.warn("Sidebar preference could not be loaded:", error);
    }

    sidebarCollapseBtn.addEventListener("click", () => {
      const collapsed = appLayout.classList.toggle("sidebar-collapsed");
      sidebarCollapseBtn.setAttribute("aria-pressed", String(collapsed));
      sidebarCollapseBtn.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      sidebarCollapseBtn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
      } catch (error) {
        console.warn("Sidebar preference could not be saved:", error);
      }
    });
  }

  if (sidebarBackdrop && sidebar) {
    sidebarBackdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebarBackdrop.classList.remove("active");
      if (mobileSidebarToggle) mobileSidebarToggle.setAttribute("aria-expanded", "false");
    });
  }

  // Quick Add Button
  if (quickAddBtn && taskInput) {
    quickAddBtn.addEventListener("click", () => {
      taskInput.focus();
      taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

function setupSearchAndSort() {
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = (searchInput.value || "").trim();
      renderTasks();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value || "newest";
      renderTasks();
    });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener("change", () => {
      currentPriority = priorityFilter.value || "all";
      renderTasks();
    });
  }
}

function setupNetworkStatus() {
  function updateOnlineStatus() {
    if (!offlinePill) return;
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      offlinePill.hidden = navigator.onLine;
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();
  }
}

function showInputError(message) {
  if (inputError) {
    inputError.textContent = message;
  }
  taskInput.focus();
}

function clearInputError() {
  if (inputError && inputError.textContent !== "") {
    inputError.textContent = "";
  }
}

// --------------------------------------------------------------------------
// 12. PWA Service Worker & Install Handler
// --------------------------------------------------------------------------

function registerServiceWorker() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    if (typeof window !== "undefined") {
      window.addEventListener("load", () => {
        // Purge any stale cache versions
        if ("caches" in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              if (key !== "taskflow-cache-v4") {
                caches.delete(key);
              }
            });
          });
        }

        navigator.serviceWorker
          .register("./sw.js")
          .then((reg) => {
            console.log("TaskFlow Service Worker active:", reg.scope);
            reg.update();
          })
          .catch((err) => {
            console.log("Service Worker registration skipped or failed:", err);
          });
      });
    }
  }
}

function setupPwaInstall() {
  if (!installPwaBtn || typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installPwaBtn.hidden = false;
  });

  installPwaBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`PWA install choice: ${outcome}`);
    deferredInstallPrompt = null;
    installPwaBtn.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    console.log("TaskFlow successfully installed!");
    if (installPwaBtn) installPwaBtn.hidden = true;
    deferredInstallPrompt = null;
  });
}

// --------------------------------------------------------------------------
// 13. Application Initialization
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  tasks = loadTasks();
  updateHeaderDate();
  setupNavigation();
  setupSearchAndSort();
  setupNetworkStatus();
  setupModalAccessibility();
  registerServiceWorker();
  setupPwaInstall();

  if (taskForm) {
    taskForm.addEventListener("submit", handleAddTask);
  }
  if (taskInput) {
    taskInput.addEventListener("input", clearInputError);
  }
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener("click", handleClearCompleted);
  }

  // Edit Modal events
  if (editForm) editForm.addEventListener("submit", handleSaveEdit);
  if (editTaskText) editTaskText.addEventListener("input", () => editTaskText.setCustomValidity(""));
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeEditModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeEditModal);
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  renderTasks();
  if (storageError) showToast(storageError);
});
