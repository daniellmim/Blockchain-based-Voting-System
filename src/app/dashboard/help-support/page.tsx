import React from "react";

export default function AboutUsPage() {
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-lg shadow-md mt-10 border border-gray-200 dark:border-gray-800">
      <h1 className="text-3xl font-bold mb-4 text-blue-700 dark:text-blue-300">
        About Us
      </h1>
      <p className="mb-6 text-gray-700 dark:text-gray-200">
        This project was developed by the following group members:
      </p>
      <ul className="mb-8 space-y-2">
        <li className="flex items-center gap-2 text-lg text-gray-800 dark:text-gray-100">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            1.
          </span>{" "}
          Abdulsmed Awol{" "}
          <span className="ml-2 text-sm text-gray-500">UGR/22997/13</span>
        </li>
        <li className="flex items-center gap-2 text-lg text-gray-800 dark:text-gray-100">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            2.
          </span>{" "}
          Abebe Nano{" "}
          <span className="ml-2 text-sm text-gray-500">UGR/22636/13</span>
        </li>
        <li className="flex items-center gap-2 text-lg text-gray-800 dark:text-gray-100">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            3.
          </span>{" "}
          Daniel Geremew{" "}
          <span className="ml-2 text-sm text-gray-500">UGR/22822/13</span>
        </li>
        <li className="flex items-center gap-2 text-lg text-gray-800 dark:text-gray-100">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            4.
          </span>{" "}
          Eyasu Yidnekachew{" "}
          <span className="ml-2 text-sm text-gray-500">UGR/22616/13</span>
        </li>
        <li className="flex items-center gap-2 text-lg text-gray-800 dark:text-gray-100">
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            5.
          </span>{" "}
          Fraol Deresse{" "}
          <span className="ml-2 text-sm text-gray-500">UGR/23614/13</span>
        </li>
      </ul>
      <h2 className="text-2xl font-semibold mb-2 text-blue-600 dark:text-blue-300">
        Contact
      </h2>
      <p className="text-gray-700 dark:text-gray-200 mb-2">
        For more information, please contact any of the group members.
      </p>
    </div>
  );
}
