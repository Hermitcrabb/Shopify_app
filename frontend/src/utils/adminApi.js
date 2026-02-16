export const adminApi = {
  get: async (url) => {
    const token = localStorage.getItem("adminToken");

    const response = await fetch(`http://localhost:8080${url}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return response.json();
  },

  post: async (url, data) => {
    const token = localStorage.getItem("adminToken");

    const response = await fetch(`http://localhost:8080${url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return response.json();
  },
};
