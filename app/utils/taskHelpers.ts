// Shared helper functions for task rendering and status handling
export const getCellStatus = (item, columnId, column) => {
  const status = (item?.completed && item.completed[columnId]) || "not-started";

  if (column && column.isFromServer && status === "future") {
    if (item.serverIsDone !== undefined) {
      if (typeof item.serverIsDone === "object") {
        return item.serverIsDone[columnId] ? "completed" : "future";
      }
      return item.serverIsDone ? "completed" : "future";
    }
  }

  return status;
};

export const shouldShowRed = (item, columnId, column) => {
  const status = getCellStatus(item, columnId, column);

  if (column && column.isFromServer) {
    if (item.isPast && status === "future" && item.serverIsDone === false) {
      return true;
    }
    return false;
  } else {
    if (item.isPast && status === "future") {
      return true;
    }
    return false;
  }
};

export const getStatusColor = (status, item, columnId, column) => {
  const cellStatus = getCellStatus(item, columnId, column);

  if (cellStatus === "completed") {
    return "#4CAF50";
  }
  if (cellStatus === "not-completed") {
    return "#F44336";
  }

  if (column && column.isFromServer) {
    if (cellStatus === "future") {
      if (item.isPast && item.serverIsDone === false) {
        return "#F44336";
      }
      return "#2196F3";
    }
  } else {
    if (cellStatus === "future") {
      if (item.isPast) {
        return "#F44336";
      }
      return "#2196F3";
    }
  }

  switch (cellStatus) {
    case "not-started":
      return "#E0E0E0";
    default:
      return "#E0E0E0";
  }
};

export const getStatusIcon = (status, shouldBeRed) => {
  if (shouldBeRed) return "✗";
  switch (status) {
    case "completed":
      return "✓";
    case "not-completed":
      return "✗";
    case "future":
      return "";
    default:
      return "";
  }
};

export const getStatusIconColor = (status, shouldBeRed, isPastDay) => {
  if (shouldBeRed) return "#FFFFFF";
  if (isPastDay) return "#666666";
  return "#FFFFFF";
};
