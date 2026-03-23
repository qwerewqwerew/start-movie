import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
//라우팅할 컴포넌트 임포트
import App from "./App.jsx";
import { Home } from "./components/Home.jsx";
import { MovieDetail } from "./components/MovieDetail.jsx";
import { ErrorPage } from "./components/ErrorPage.jsx";
import { Category } from "./components/Category.jsx";
// 리액트는 컴포넌트간의 연결을 하기위한 라우터 설정과정이 필요함
import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "movie/:id",
        element: <MovieDetail />,
      },
      { path: "category/:type", element: <Category /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
