import Link from 'next/link';
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  link?: string;
  linkText?: string;
  icon?: React.ReactNode; // Optional icon element
  bgColorClass?: string; // e.g., 'bg-blue-100'
  textColorClass?: string; // e.g., 'text-blue-800'
  valueColorClass?: string; // e.g., 'text-blue-900'
}

export default function StatCard({
  title,
  value,
  link,
  linkText = 'View Details',
  icon,
  bgColorClass = 'bg-gray-100',
  textColorClass = 'text-gray-700',
  valueColorClass = 'text-gray-900',
}: StatCardProps) {
  const content = (
    <>
      {icon && <div className="mr-4 text-2xl">{icon}</div>}
      <div>
        <dt className={`text-sm font-medium truncate ${textColorClass}`}>
          {title}
        </dt>
        <dd className={`mt-1 text-3xl font-semibold ${valueColorClass}`}>
          {value}
        </dd>
      </div>
    </>
  );

  if (link) {
    return (
      <Link
        href={link}
        className={`block p-4 rounded-lg shadow hover:shadow-md transition ${bgColorClass}`}
      >
        <dl className="flex items-center">{content}</dl>
        <div className="mt-2 text-xs text-indigo-600 hover:underline">
          {linkText}
        </div>
      </Link>
    );
  }

  return (
    <div className={`p-4 rounded-lg shadow ${bgColorClass}`}>
      <dl className="flex items-center">{content}</dl>
    </div>
  );
}
