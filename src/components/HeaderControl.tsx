import React from "react";

interface Props {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

const HeaderControl: React.FC<Props> = ({ headers }) => {
  return (
    <>
      {headers && (
        <>
          <table>
            <thead>
              <tr>
                <th>Header</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(headers).map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{headers[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
};

export default HeaderControl;
